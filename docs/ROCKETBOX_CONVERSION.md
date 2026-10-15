# Selected Rocketbox FBX → GLB conversion

The app does not automatically download or redistribute every third-party character. Download the library first and choose one character whose included licence notice and intended use you have reviewed.

## Convert one selected character

Install Blender 3.6+ (or a compatible Blender 4.x build), then run from the repository root:

```bash
npm run assets:rocketbox
blender --background --python scripts/blender/convert_rocketbox_to_glb.py -- \
  "downloads/third-party/Microsoft-Rocketbox/path/to/character.fbx" \
  "public/assets/avatars/rocketbox-character.glb"
```

The converter imports one FBX, exports a GLB with textures, skinning, animation (unless `--no-animation` is passed), and available morph targets. It writes a JSON conversion report next to the GLB. Inspect `morph_targets_by_mesh` before expecting lip-sync; a rigged body alone does not mean facial visemes exist.

To omit animation tracks:

```bash
blender --background --python scripts/blender/convert_rocketbox_to_glb.py -- \
  "path/to/character.fbx" "public/assets/avatars/rocketbox-character.glb" --no-animation
```

## Add it to NKAI Studio

Copy the resulting GLB into the app's public asset folder and add its exact path to the avatar selector/catalog. Keep the Rocketbox MIT notice and any upstream attribution with redistributed assets. Do not commit the entire downloaded library or large binary models to the source repository without reviewing the project's asset policy.

## Validation checklist

- Open the GLB in Blender and a browser GLB viewer.
- Confirm textures, skeleton, scale, orientation and animation.
- Confirm the conversion report lists facial morph targets if lip-sync is expected.
- Test the actual avatar with the TalkingHead engine. Its supported viseme names and expected rig are stricter than simply having morph targets.
- Keep the conversion report and source asset path for traceability.
