// Error handling
function raiseError(primary, secondary = null) {
  document.getElementById('form').classList.add('hidden');

  const element = document.getElementById('error');
  element.classList.remove('hidden');
  element.innerText = primary;

  if (secondary) {
    const element2 = document.createElement('div');
    element2.classList = ['error-secondary'];
    element2.innerText = secondary;
    element.appendChild(element2);
  }

  throw new Error(primary);
}

// Localization
const TRANSLATIONS = {
  // English
  en: {
    'title': 'Attribution Metadata Editor',
    'error-site': 'Unknown site: ',
    'error-site-secondary': 'Pass in a site slug or INT language code.',
    // TODO
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

const ATTRIBUTION_TYPES = [
  'author',
  'rewrite',
  'translator',
  'maintainer',
];

function getAttributionType(value) {
  value = value.toLowerCase();

  for (const attributionType of ATTRIBUTION_TYPES) {
    if (attributionType.startsWith(value)) {
      return attributionType;
    }
  }

  raiseError(`Invalid attribution type: ${value}`);
}

function getSiteSlug(language, site) {
  // The input can be the site slug or the branch language code.

  switch (site.toLowerCase()) {
    // SCP
    case 'en':
    case 'scp-wiki':
      return 'scp-wiki';
    case 'ru':
    case 'scp-ru':
      return 'scp-ru';
    case 'ko':
    case 'scpko':
      return 'scpko';
    case 'cn':
    case 'scp-wiki-cn':
      return 'scp-wiki-cn';
    case 'fr':
    case 'fondationscp':
      return 'fondationscp';
    case 'pl':
    case 'scp-pl':
      return 'scp-pl';
    case 'es':
    case 'lafundacionscp':
      return 'lafundacionscp';
    case 'th':
    case 'scp-th':
      return 'scp-th';
    case 'jp':
    case 'scp-jp':
      return 'scp-jp';
    case 'de':
    case 'scp-wiki-de':
      return 'scp-wiki-de';
    case 'it':
    case 'fondazionescp':
      return 'fondazionescp';
    case 'uk':
    case 'scp-ukrainian':
      return 'scp-ukrainian';
    case 'pt':
    case 'pt-br':
    case 'scp-pt-br':
      return 'scp-pt-br';
    case 'cs':
    case 'scp-cs':
      return 'scp-cs';
    case 'zh':
    case 'zh-tr':
      return 'scp-zh-tr';
    case 'vn':
    case 'scp-vn':
      return 'scp-vn';

    // Wanderer's Library
    case 'wl':
    case 'wl-en':
      return 'wanderers-library';

    // Unknown or typo
    default:
      raiseError(
        getMessage(language, 'error-site') + site,
        getMessage(language, 'error-site-secondary'),
      );
  }
}

// Initialization

function initializeSite(language, site) {
  document.getElementById('main-site').value = getSiteSlug(language, site);
}

function initializeMessages(language) {
  function setMessage(id, messageKey = null) {
    document.getElementById(id).innerText = getMessage(language, messageKey || id);
  }

  document.title = getMessage(language, 'title');

  // TODO
}

function initializeHooks(language) {
  // TODO
}

function setup() {
  const url = new URL(window.location.href);
  const parameters = new URLSearchParams(url.search);
  const language = parameters.get('lang');
  const site = parameters.get('site');

  if (!language) {
    raiseError('No language set', 'Parameter is "lang". Use "en" for English.');
    return;
  }

  initializeSite(language, site);
  initializeMessages(language);
  initializeHooks(language);
}

setTimeout(setup, 5);
