## attribution-metadata Web

This is a web UI for interfacing with the `attribution-metadata` Lambda service. It enables users to interact with the API in a user-friendly way, via their browser.

### Internationalization

This application supports translating into other languages. Simply add a corresponding list of translation strings within the `TRANSLATIONS` block in `src/util/i18n.ts`, connected with the language code. Then, on load, specifying the language code results in that language being loaded in the UI.

### Deployment

First, ensure dependencies are up-to-date:
```
npm install
```

You can run a local development server:
```
npm run dev
```

And when it's ready to be deployed, you can bundle the app:
```
npm run build
```

You can also use `bun` for these steps instead of `npm`.

### Special Thanks

Thanks to smlt for contributing the initial version of this web frontend.
