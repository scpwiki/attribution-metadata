// Constants
const ATTRIBUTION_TYPES = [
  'author',
  'rewrite',
  'translator',
  'maintainer',
];

// Error handling
function raiseError(primary, secondary = null) {
  const element = document.getElementById('error');
  element.classList.remove('hidden');
  element.innerText = primary;

  if (secondary) {
    const element2 = document.createElement('div');
    element2.classList = ['error-secondary'];
    element.appendChild(element2);
  }

  throw new Error(primary);
}

// Localization
const TRANSLATIONS = {
  // English
  en: {
  },
};

function getMessage(language, messageKey) {
  // Special case:
  // The 'test' language just echoes the message key back out.
  if (language === 'test') {
    return messageKey;
  }

  const messages = TRANSLATIONS[language];
  if (!messages) {
    raiseError(`No translations for language: ${language}`);
  }

  const message = messages[messageKey];
  if (!message) {
    raiseError(`No such message key: ${messageKey}`);
  }

  return message;
}

// Crom

const CROM_ENDPOINT = 'https://api.crom.avn.sh/graphql';
const CROM_USER_QUERY = `
{
  user(name: $user) {
    wikidotInfo {
      displayName,
      wikidotId,
    }
  }
}
`;

async function getUserInfo(name) {
  const query = CROM_USER_QUERY.replace('$user', JSON.stringify(name));
  const request = new Request(CROM_ENDPOINT, {
    keepalive: true,
    method: 'POST',
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const response = await fetch(request);
  const { data: { user: { wikidotInfo } } } = await response.json();

  if (wikidotInfo === null) {
    return { name: null, id: null };
  } else {
    const { displayName: name, wikidotId: id } = wikidotInfo;
    return { name, id };
  };
}

// AttributionMetadataService
const ATTRIB_ENDPOINT = 'https://tptm7stb3j3onds27seddf2izq0mcesv.lambda-url.us-east-2.on.aws';
// TODO

// Utilities
function getAttributionType(value) {
  value = value.toLowerCase();

  for (const attributionType of ATTRIBUTION_TYPES) {
    if (attributionType.startsWith(value)) {
      return attributionType;
    }
  }

  raiseError(`Invalid attribution type: ${value}`);
}

// Initialization
function initializeMessages(language) {
}

function initializeHooks(language) {
}

function setup() {
  const url = new URL(window.location.href);
  const parameters = new URLSearchParams(url.search);
  const language = parameters.get('lang');
  const styling = parameters.get('style');

  if (!language) {
    setError('No language set', 'Parameter is "lang". Use "en" for English.');
    return;
  }

  initializeMessages(language);
  initializeHooks(language);
}

setTimeout(setup, 5);
