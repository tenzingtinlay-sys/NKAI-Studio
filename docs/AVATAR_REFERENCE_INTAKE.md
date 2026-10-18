# Avatar reference intake — HeyGen preview links

Status: reference-only intake. These links were supplied by the project owner for visual evaluation. No preview video, face data, voice sample, model weights, or proprietary assets have been downloaded or copied into NKAI Studio.

## Initial reference set

| Avatar | Look | Preview URL | Intake status | Reuse permission |
|---|---:|---|---|---|
| Marieke | Modern Corporate 1 | https://resource2.heygen.ai/public-avatars/Marieke/lookpack/previews/Modern_Corporate_1.mp4 | Link recorded; visual/audio review pending | Not established |
| Marieke | Modern Corporate 2 | https://resource2.heygen.ai/public-avatars/Marieke/lookpack/previews/Modern_Corporate_2.mp4 | Link recorded; visual/audio review pending | Not established |

## Intake record schema

For each reference that the project owner is authorized to review, record:

- Avatar display name and look label
- Source page and preview URL
- Visual notes: framing, wardrobe, background, graphics, camera motion
- Audio notes: whether speech is present; language and broad voice characteristics only
- Asset type confirmed: rendered preview, rigged 3D model, voice checkpoint, or unknown
- Rights holder / licence URL / written permission record
- Allowed use: internal review, local deployment, redistribution, commercial use
- Review date and reviewer

## Important boundary

A playable MP4 is a rendered preview, not a downloadable 3D avatar or voice model. A public URL alone does not establish permission to copy the video, extract a person's likeness or voice, or bundle the underlying assets in another product. HeyGen's current Terms prohibit automated scraping/extraction and copying of proprietary service content except as expressly permitted. Do not add bulk crawlers, sequential URL downloaders, authenticated catalogue extraction, or face/voice asset extraction to this repository.

Official policy reference: https://www.heygen.com/terms

## NKAI implementation direction

Build the runtime around independently licensed assets: rigged GLB/VRM avatars with verified blendshapes/visemes, plus speech models whose individual model and voice licences permit the intended deployment. Keep third-party preview links as external references only. Mark an avatar as deployable only after rights and technical compatibility are verified.
