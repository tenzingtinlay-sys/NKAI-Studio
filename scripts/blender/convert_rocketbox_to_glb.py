"""Convert one selected Microsoft Rocketbox FBX character to browser-ready GLB.

Run with Blender 3.6+ (or a compatible Blender 4.x build):
  blender --background --python scripts/blender/convert_rocketbox_to_glb.py -- \
    "downloads/third-party/Microsoft-Rocketbox/path/to/character.fbx" \
    "public/assets/avatars/rocketbox-character.glb"

This deliberately converts one chosen character per invocation; it does not bundle
all third-party assets automatically. Review the repository's MIT notice and retain
it with redistributed assets. Facial blendshapes are preserved when present but
must be tested in the actual browser avatar engine.
"""
import json
import sys
from pathlib import Path

import bpy


def parse_args():
    if "--" not in sys.argv:
        raise SystemExit("Expected input FBX and output GLB after --")
    args = sys.argv[sys.argv.index("--") + 1 :]
    if len(args) not in (2, 3):
        raise SystemExit(
            "Usage: blender --background --python convert_rocketbox_to_glb.py -- "
            "INPUT.fbx OUTPUT.glb [--no-animation]"
        )
    return Path(args[0]).expanduser().resolve(), Path(args[1]).expanduser().resolve(), not (
        len(args) == 3 and args[2] == "--no-animation"
    )


def main():
    source, output, include_animation = parse_args()
    if not source.is_file() or source.suffix.lower() != ".fbx":
        raise SystemExit(f"Input must be an existing FBX file: {source}")
    if output.suffix.lower() != ".glb":
        raise SystemExit(f"Output must end in .glb: {output}")

    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images, bpy.data.actions):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)

    bpy.ops.import_scene.fbx(filepath=str(source), use_image_search=True)
    imported = list(bpy.context.scene.objects)
    if not imported:
        raise SystemExit("FBX import produced no scene objects.")

    meshes = [obj for obj in imported if obj.type == "MESH"]
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    if not meshes:
        raise SystemExit("FBX import produced no mesh. Check the selected Rocketbox asset.")

    morphs = {}
    for mesh in meshes:
        keys = mesh.data.shape_keys
        if keys and keys.key_blocks:
            morphs[mesh.name] = [key.name for key in keys.key_blocks if key.name != "Basis"]

    # Keep all imported character objects, textures and shape keys. Export glTF's
    # skin/morph support so the browser can inspect facial animation capability.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in imported:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armatures[0] if armatures else meshes[0]

    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_skins=True,
        export_morph=True,
        export_morph_normal=True,
        export_morph_tangent=False,
        export_animations=include_animation,
        export_image_format="AUTO",
    )

    report = {
        "source_fbx": str(source),
        "output_glb": str(output),
        "mesh_count": len(meshes),
        "armature_count": len(armatures),
        "animation_export_enabled": include_animation,
        "morph_targets_by_mesh": morphs,
        "has_morph_targets": bool(morphs),
        "warning": "A GLB export does not guarantee TalkingHead compatibility; validate required viseme/blendshape names and test lip-sync in-browser.",
    }
    report_path = output.with_suffix(".conversion-report.json")
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(f"Exported GLB: {output}")
    print(f"Conversion report: {report_path}")


if __name__ == "__main__":
    main()
