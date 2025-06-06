# Security Policy

## Secret Storage

TON Graph stores the TONcenter API key exclusively using VS Code's `ExtensionContext.secrets` API.
The implementation in [src/secrets/tokenManager.ts](src/secrets/tokenManager.ts)
invokes `context.secrets.get`, `context.secrets.store`, and `context.secrets.delete` to
retrieve, save, and remove the key. VS Code encrypts these secrets on disk, so no
API keys are written to the extension's configuration files or logs.

## Emergency Update Procedure

If a critical vulnerability is discovered, maintainers will publish an immediate patch release on the `main` branch and the VS Code Marketplace. Users should update the extension as soon as possible.

If necessary, the extension can be temporarily disabled from VS Code by selecting **Disable** in the Extensions view. Maintainers may also remove the extension from the marketplace until the issue is resolved.

