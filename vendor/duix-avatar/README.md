# Duix Avatar source in NKAI Studio

The upstream Duix Avatar archive was removed after extraction to keep the repository clean. The extracted source is committed at [`source/Duix-Avatar-main`](source/Duix-Avatar-main). The extraction workflow was also removed because it depended on the deleted archive.

**Integration status:** source extracted to `main`; not yet connected as a live video-generation backend in the NKAI web Studio. The upstream app is Electron/Vue and its generation services require a compatible Docker/GPU runtime.

**Licence and attribution:** preserve the upstream `LICENSE`, model community licensing agreement PDFs, and `source/Duix-Avatar-main/NOTICE`. Any distributed integration must prominently display **Built with DUIX.COM** and include a clear statement in user-facing legal terms that it incorporates DUIX.COM technology. The current NKAI plan is research-only/non-commercial; separately audit the licences for model weights, voices, Docker images, and bundled dependencies.

Deployment notes: [`deploy/duix-avatar/README.md`](../../deploy/duix-avatar/README.md).
