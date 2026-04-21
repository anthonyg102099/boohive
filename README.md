# Snap Archive Viewer

Crossplatform React Native viewer for Snapchat exports.

The old single-file HTML app has been replaced with a modular Expo application that
keeps the same offline-first intent while making the codebase easier to understand,
test, and extend.

## What It Does

- Browse Snapchat memories with photo/video previews and overlay toggles
- Read conversation history with a split chat list and thread view
- Inspect snap history, search history, profile data, friends, and login history
- Import archives locally as ZIP files on web, iOS, and Android

## Architecture

The app is organized around three layers:

1. `src/services` handles archive import and parsing
2. `src/screens` contains user-facing views
3. `src/components` contains reusable UI building blocks

That separation keeps the responsibilities narrow and makes the app easier to evolve
without reintroducing a monolith.

## Import Flow

1. Export Snapchat data from `Settings > My Data`
2. Make sure the export includes the data categories you want to browse
3. Download the ZIP file
4. Open the app and choose `Import`
5. Select the ZIP file and let the app parse it locally

## Running It

This repo is set up like an Expo app.

```bash
npm install
npm run start
```

Then choose one of:

- `npm run android`
- `npm run ios`
- `npm run web`

## Notes

- The archive is processed locally
- Media files are materialized into device cache on native platforms and blob URLs on web
- The old `index.html` is kept in the repository as a legacy reference, but the active app lives in `App.tsx`

## Screens

- `Import` for loading a ZIP export
- `Memories` for browsing saved photos and videos
- `Chats` for conversation threads
- `Records` for friends, snap history, search history, profile details, and login history

