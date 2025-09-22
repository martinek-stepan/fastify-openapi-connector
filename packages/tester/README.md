# Custom Identities API

REST API service for managing custom identity operations and integration with external identity providers.

## Description

This API service handles custom identity management operations within the AMS platform. It provides endpoints for user management with Entra ID, group management, and integration with external systems like SCIM and SSO providers. The service runs as a Docker container on AWS Fargate and integrates with Essay, and PACE. 

## Prerequisites

- Node.js (22)
- Docker (for containerization)
- PostgreSQL database (local or remote)
- Access to external identity management APIs
- Valid authentication credentials for integrated services

## Architecture

This service integrates with multiple external systems:
- **SCIM API**: For user provisioning and management
- **User Management API**: For colleague enablement operations
- **Group Management API**: For managing user groups and permissions
- **Pace SSO**: For single sign-on authentication

## Composition 
- The [API specs](../../../apis/custom-identities/) for this package is located in the `apis` package. 
- The [generated schemas and defs](../../../generated/custom-identities/) for it are located in the `generated` package.
- The [database](../ci-db/) setup and schema can be found in the `cps-db` package
- The [infrastructure](../ci-api-inf/) can be found in the `cps-inf` package

## Environment Variables

### Required for Local Development

Create a `.env` file in the root of the package with the following variables:

✅ See `Pulumi.dev.yaml` in `./packages/custom-identities/ci-api-inf` to ensure you have set all necessary env vars.

## How to Run

### Install Dependencies
```bash
pnpm i
```

### Using local db
Make sure to set up your local DB by navigating to the `ci-db` package and following the [README.md](../ci-db/README.md)

### Run API
```bash
pnpm debug
```


## Security Configuration

### SSO Security Groups
The following security groups are configured for SSO access into Pace:

- **Development**: `bccf1d85-49d1-4129-ae55-35611c07ac61`
- **Production**: `28866c8f-9a07-44ac-aed8-abc4f973174c`


### Contributing
After changing the API spec make sure to regenerate the API schema:

```bash
pnpm generate
```
After that you can implement the route in a new file names after the operationId.

### Making a PR
Remember to the following commands before making a pr:
```
pnpm -w run build --noemit
pnpm -w run lint
pnpm -w run mismatch:fix
pnpm -w run depcheck
```
