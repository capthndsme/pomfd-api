# Pomfd (API/Coordinator)
The capthndsme cloud storage/pomf hybrid

## What does it do:
- Extensible uploads
- Direct-to-server uploads
- Coordinator/API to server uploads 
- Basic File Management
- Basic Preview System

## How to:
1. Deploy the API 
2. Deploy the StorageServers

## StorageServers deployment
Coming soon, will make an `ace` command for deployments.

## Developing the application
1. Configure your .env file
2. run `yarn` to install packages
3. Run migrations - `node ace migration:run`

## Deployment
1. Build the application - `node ace build --production`
2. Copy .env to the `/build/` directory.
3. Deploy it wherever. Start the app with `node bin/server.js`


## Built with 
- [AdonisJS](https://adonisjs.com/)
- [Lucid](https://lucid.adonisjs.com/docs/introduction)
