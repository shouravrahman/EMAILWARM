import { promises as dns } from 'dns';

export interface MXRecord {
  exchange: string;
  priority: number;
}

export interface EmailValidationResult {
  valid: boolean;
  reason?: string;
  mxRecords?: MXRecord[];
}

/**
 * List of known disposable email domains
 * This is a curated list of common temporary email providers
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Popular disposable email services
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  '10minutemail.com',
  '10minutemail.net',
  'mailinator.com',
  'throwaway.email',
  'trashmail.com',
  'getnada.com',
  'temp-mail.io',
  'mohmal.com',
  'fakeinbox.com',
  'maildrop.cc',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'hide.biz.st',
  'mymail.infos.st',
  'sharklasers.com',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.de',
  'spam4.me',
  'tmails.net',
  'dispostable.com',
  'mintemail.com',
  'emailondeck.com',
  'spamgourmet.com',
  'mailnesia.com',
  'mailcatch.com',
  'mailnull.com',
  'spambox.us',
  'spamfree24.org',
  'spamfree24.de',
  'spamfree24.eu',
  'spamfree24.info',
  'spamfree24.net',
  'spamfree24.com',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'trashmail.net',
  'trashmail.org',
  'trashmail.ws',
  'trash-mail.com',
  'trash-mail.de',
  'trash-mail.at',
  'trash-mail.cf',
  'trash-mail.ga',
  'trash-mail.gq',
  'trash-mail.ml',
  'trash-mail.tk',
  'getairmail.com',
  'getairmail.cf',
  'getairmail.ga',
  'getairmail.gq',
  'getairmail.ml',
  'getairmail.tk',
  'anonbox.net',
  'anonymbox.com',
  'binkmail.com',
  'bobmail.info',
  'dumpmail.de',
  'emailias.com',
  'filzmail.com',
  'incognitomail.com',
  'incognitomail.net',
  'incognitomail.org',
  'jetable.com',
  'jetable.net',
  'jetable.org',
  'kasmail.com',
  'klzlk.com',
  'kulturbetrieb.info',
  'kurzepost.de',
  'lifebyfood.com',
  'link2mail.net',
  'litedrop.com',
  'lroid.com',
  'mt2009.com',
  'mt2014.com',
  'mytrashmail.com',
  'nobulk.com',
  'noclickemail.com',
  'nogmailspam.info',
  'nomail.pw',
  'nomail2me.com',
  'nospamfor.us',
  'objectmail.com',
  'oneoffemail.com',
  'onewaymail.com',
  'ordinaryamerican.net',
  'pookmail.com',
  'proxymail.eu',
  'rcpt.at',
  'reallymymail.com',
  'recode.me',
  'recursor.net',
  'reliable-mail.com',
  'rhyta.com',
  'rmqkr.net',
  'safe-mail.net',
  'safersignup.de',
  'safetymail.info',
  'safetypost.de',
  'sandelf.de',
  'saynotospams.com',
  'schafmail.de',
  'schrott-email.de',
  'secretemail.de',
  'secure-mail.biz',
  'secure-mail.cc',
  'selfdestructingmail.com',
  'sendspamhere.com',
  'shiftmail.com',
  'shortmail.net',
  'sibmail.com',
  'skeefmail.com',
  'slaskpost.se',
  'slopsbox.com',
  'smellfear.com',
  'snakemail.com',
  'sneakemail.com',
  'sofimail.com',
  'sofort-mail.de',
  'sogetthis.com',
  'soodonims.com',
  'spam.la',
  'spamail.de',
  'spamarrest.com',
  'spambob.com',
  'spambob.net',
  'spambob.org',
  'spambog.com',
  'spambog.de',
  'spambog.ru',
  'spamcannon.com',
  'spamcannon.net',
  'spamcon.org',
  'spamcorptastic.com',
  'spamcowboy.com',
  'spamcowboy.net',
  'spamcowboy.org',
  'spamday.com',
  'spamex.com',
  'spamfree.eu',
  'spamgoes.in',
  'spamherelots.com',
  'spamhereplease.com',
  'spamhole.com',
  'spamify.com',
  'spaminator.de',
  'spamkill.info',
  'spaml.com',
  'spaml.de',
  'spammotel.com',
  'spamobox.com',
  'spamoff.de',
  'spamslicer.com',
  'spamspot.com',
  'spamthis.co.uk',
  'spamthisplease.com',
  'spamtrail.com',
  'speed.1s.fr',
  'supergreatmail.com',
  'supermailer.jp',
  'suremail.info',
  'teewars.org',
  'teleworm.com',
  'teleworm.us',
  'temp-mail.de',
  'temp-mail.ru',
  'tempe-mail.com',
  'tempemail.biz',
  'tempemail.co.za',
  'tempemail.com',
  'tempemail.net',
  'tempinbox.co.uk',
  'tempinbox.com',
  'tempmail.eu',
  'tempmail.it',
  'tempmail2.com',
  'tempmaildemo.com',
  'tempmailer.com',
  'tempmailer.de',
  'tempomail.fr',
  'temporarily.de',
  'temporarioemail.com.br',
  'temporaryemail.net',
  'temporaryemail.us',
  'temporaryforwarding.com',
  'temporaryinbox.com',
  'temporarymailaddress.com',
  'tempthe.net',
  'thankyou2010.com',
  'thisisnotmyrealemail.com',
  'throwawayemailaddress.com',
  'tilien.com',
  'tmailinator.com',
  'tradermail.info',
  'trbvm.com',
  'trialmail.de',
  'trillianpro.com',
  'twinmail.de',
  'tyldd.com',
  'uggsrock.com',
  'upliftnow.com',
  'uplipht.com',
  'venompen.com',
  'veryrealemail.com',
  'viditag.com',
  'viewcastmedia.com',
  'viewcastmedia.net',
  'viewcastmedia.org',
  'webm4il.info',
  'wegwerfadresse.de',
  'wegwerfemail.de',
  'wegwerfmail.info',
  'wetrainbayarea.com',
  'wetrainbayarea.org',
  'wh4f.org',
  'whyspam.me',
  'willselfdestruct.com',
  'winemaven.info',
  'wronghead.com',
  'wuzup.net',
  'wuzupmail.net',
  'www.e4ward.com',
  'www.mailinator.com',
  'wwwnew.eu',
  'xagloo.com',
  'xemaps.com',
  'xents.com',
  'xmaily.com',
  'xoxy.net',
  'yapped.net',
  'yopmail.pp.ua',
  'yuurok.com',
  'zehnminuten.de',
  'zehnminutenmail.de',
  'zippymail.info',
  'zoaxe.com',
  'zoemail.net',
  'zomg.info',
]);

/**
 * Checks if an email address uses a disposable email domain
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return false;
  }
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Validates if an email domain has valid MX records
 */
export async function validateEmailMXRecords(email: string): Promise<EmailValidationResult> {
  try {
    const domain = email.split('@')[1];
    
    if (!domain) {
      return {
        valid: false,
        reason: 'Invalid email format'
      };
    }

    // Resolve MX records for the domain
    const records = await dns.resolveMx(domain);
    
    if (!records || records.length === 0) {
      return {
        valid: false,
        reason: 'No MX records found for domain'
      };
    }

    // Sort by priority (lower number = higher priority)
    const sortedRecords = records
      .map((record: { exchange: string; priority: number }) => ({
        exchange: record.exchange,
        priority: record.priority
      }))
      .sort((a: MXRecord, b: MXRecord) => a.priority - b.priority);

    return {
      valid: true,
      mxRecords: sortedRecords
    };
  } catch (error: any) {
    // DNS lookup errors
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return {
        valid: false,
        reason: 'Domain does not exist or has no MX records'
      };
    }

    return {
      valid: false,
      reason: `DNS lookup failed: ${error.message}`
    };
  }
}

/**
 * Checks if an email address has valid MX records
 */
export async function hasMXRecords(email: string): Promise<boolean> {
  const result = await validateEmailMXRecords(email);
  return result.valid;
}

/**
 * Validates email format using regex
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates email domain (checks disposable and MX records)
 */
export async function validateEmailDomain(email: string): Promise<EmailValidationResult> {
  const domain = email.split('@')[1];
  
  if (!domain) {
    return {
      valid: false,
      reason: 'Invalid email format'
    };
  }
  
  // Check if it's a disposable email
  if (isDisposableEmail(email)) {
    return {
      valid: false,
      reason: 'Disposable email addresses are not allowed'
    };
  }
  
  // Check MX records
  const mxResult = await validateEmailMXRecords(email);
  if (!mxResult.valid) {
    return mxResult;
  }
  
  return {
    valid: true,
    mxRecords: mxResult.mxRecords
  };
}

/**
 * Comprehensive email validation
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  // Check format first
  if (!isValidEmailFormat(email)) {
    return {
      valid: false,
      reason: 'Invalid email format'
    };
  }

  // Check domain (disposable and MX records)
  return await validateEmailDomain(email);
}
