# Duix avatar creator integration

The NKAI Studio Avatars panel includes a Duix Cloud creator form backed by a server-side proxy.

## Required deployment configuration

Set `DUIX_API_TOKEN` as a **server-side secret** in the full-stack deployment environment. Never put it in a `VITE_*` variable, frontend config, committed file, or browser storage.

The proxy sends a POST request to:

`https://app.duix.ai/duix-openapi-v2/sdk/v2/createAvatar`

It forwards only the documented fields `conversationId`, `ttsName`, `name`, `greetings`, and `profile`. The API request uses the `token` header. The language selector in the UI is a preference only because the provided example does not document a language request field. The provided Duix page excerpt does not document a separate avatar-library identifier, photo-upload payload, token-acquisition endpoint, or the meaning of its language selector, so the UI does not invent those fields. Photo upload is a preview-only UI path and creation is intentionally disabled until Duix's current API schema for photo upload is confirmed.

## Before enabling for users

1. Obtain the API token and a valid `conversationId` through the Duix account/API workflow.
2. Set `DUIX_API_TOKEN` in the server deployment secret manager.
3. Test with a permitted Duix account and check the returned response; a successful HTTP response is not by itself proof that a playable avatar is ready.
4. Verify the Duix account plan, usage charges, consent requirements, and commercial terms.
5. Add authenticated-user authorization/rate limiting before exposing this proxy publicly. Do not rely on hiding the form as access control.
