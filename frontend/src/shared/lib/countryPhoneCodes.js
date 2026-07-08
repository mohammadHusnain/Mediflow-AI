function flagEmoji(iso2) {
  return String(iso2 || '')
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0)),
    )
}

function uniqueSortedLengths(lengths) {
  return [...new Set(lengths)]
    .map((length) => Number(length))
    .filter((length) => Number.isFinite(length) && length > 0)
    .sort((first, second) => first - second)
}

function country(name, dialCode, iso2, digitLengths, placeholder, options = {}) {
  const nationalPrefix = options.national_prefix || ''

  return {
    name,
    dial_code: dialCode,
    flag_emoji: flagEmoji(iso2),
    iso2,
    digit_lengths: uniqueSortedLengths(digitLengths),
    local_digit_lengths: uniqueSortedLengths([
      ...digitLengths,
      ...(options.local_digit_lengths || []),
    ]),
    national_prefix: nationalPrefix,
    placeholder,
  }
}

const LEN_5_6 = [5, 6]
const LEN_5_7 = [5, 6, 7]
const LEN_6_7 = [6, 7]
const LEN_6_10 = [6, 7, 8, 9, 10]
const LEN_7_13 = [7, 8, 9, 10, 11, 12, 13]
const LEN_7_8 = [7, 8]
const LEN_7_9 = [7, 8, 9]
const LEN_7_10 = [7, 8, 9, 10]
const LEN_8_9 = [8, 9]
const LEN_8_10 = [8, 9, 10]
const LEN_9_10 = [9, 10]
const LEN_9_12 = [9, 10, 11, 12]
const LEN_10 = [10]
const LEN_10_11 = [10, 11]
const LEN_11 = [11]

export const COUNTRY_PHONE_CODES = [
  country('Afghanistan', '+93', 'AF', [9], '70 123 4567'),
  country('Albania', '+355', 'AL', LEN_8_9, '66 123 4567'),
  country('Algeria', '+213', 'DZ', [9], '551 23 45 67'),
  country('Andorra', '+376', 'AD', [6], '312 345'),
  country('Angola', '+244', 'AO', [9], '923 123 456'),
  country('Antigua and Barbuda', '+1', 'AG', LEN_10, '268 464 1234'),
  country('Argentina', '+54', 'AR', LEN_10, '9 11 2345 6789'),
  country('Armenia', '+374', 'AM', [8], '77 123456'),
  country('Australia', '+61', 'AU', [9], '412 345 678'),
  country('Austria', '+43', 'AT', LEN_7_13, '664 1234567'),
  country('Azerbaijan', '+994', 'AZ', [9], '50 123 45 67'),
  country('Bahamas', '+1', 'BS', LEN_10, '242 359 1234'),
  country('Bahrain', '+973', 'BH', [8], '3600 1234'),
  country('Bangladesh', '+880', 'BD', LEN_10, '1812 345678'),
  country('Barbados', '+1', 'BB', LEN_10, '246 250 1234'),
  country('Belarus', '+375', 'BY', [9], '29 123 45 67'),
  country('Belgium', '+32', 'BE', [9], '470 12 34 56'),
  country('Belize', '+501', 'BZ', [7], '622 1234'),
  country('Benin', '+229', 'BJ', [8], '90 12 34 56'),
  country('Bhutan', '+975', 'BT', [8], '17 12 34 56'),
  country('Bolivia', '+591', 'BO', [8], '71234567'),
  country('Bosnia and Herzegovina', '+387', 'BA', [8], '61 123 456'),
  country('Botswana', '+267', 'BW', [8], '71 123 456'),
  country('Brazil', '+55', 'BR', LEN_10_11, '11 91234 5678'),
  country('Brunei', '+673', 'BN', [7], '712 3456'),
  country('Bulgaria', '+359', 'BG', [9], '87 123 4567'),
  country('Burkina Faso', '+226', 'BF', [8], '70 12 34 56'),
  country('Burundi', '+257', 'BI', [8], '79 12 34 56'),
  country('Cabo Verde', '+238', 'CV', [7], '991 12 34'),
  country('Cambodia', '+855', 'KH', LEN_8_9, '12 345 678'),
  country('Cameroon', '+237', 'CM', [9], '6 71 23 45 67'),
  country('Canada', '+1', 'CA', LEN_10, '416 123 4567'),
  country('Central African Republic', '+236', 'CF', [8], '70 12 34 56'),
  country('Chad', '+235', 'TD', [8], '63 01 23 45'),
  country('Chile', '+56', 'CL', [9], '9 6123 4567'),
  country('China', '+86', 'CN', LEN_11, '131 2345 6789'),
  country('Colombia', '+57', 'CO', LEN_10, '300 1234567'),
  country('Comoros', '+269', 'KM', [7], '321 23 45'),
  country('Congo', '+242', 'CG', [9], '06 123 4567'),
  country('Costa Rica', '+506', 'CR', [8], '8312 3456'),
  country('Cote dIvoire', '+225', 'CI', LEN_8_10, '07 12 34 5678'),
  country('Croatia', '+385', 'HR', LEN_8_9, '91 234 5678'),
  country('Cuba', '+53', 'CU', [8], '5 1234567'),
  country('Cyprus', '+357', 'CY', [8], '96 123456'),
  country('Czech Republic', '+420', 'CZ', [9], '601 123 456'),
  country('Democratic Republic of the Congo', '+243', 'CD', [9], '81 234 5678'),
  country('Denmark', '+45', 'DK', [8], '20 12 34 56'),
  country('Djibouti', '+253', 'DJ', [8], '77 83 10 01'),
  country('Dominica', '+1', 'DM', LEN_10, '767 225 1234'),
  country('Dominican Republic', '+1', 'DO', LEN_10, '809 234 5678'),
  country('Ecuador', '+593', 'EC', [9], '99 123 4567'),
  country('Egypt', '+20', 'EG', [10], '100 123 4567'),
  country('El Salvador', '+503', 'SV', [8], '7012 3456'),
  country('Equatorial Guinea', '+240', 'GQ', [9], '222 123 456'),
  country('Eritrea', '+291', 'ER', [7], '7 123456'),
  country('Estonia', '+372', 'EE', LEN_7_8, '5123 4567'),
  country('Eswatini', '+268', 'SZ', [8], '76 123 456'),
  country('Ethiopia', '+251', 'ET', [9], '91 123 4567'),
  country('Fiji', '+679', 'FJ', [7], '701 2345'),
  country('Finland', '+358', 'FI', LEN_7_10, '40 123 4567'),
  country('France', '+33', 'FR', [9], '6 12 34 56 78'),
  country('Gabon', '+241', 'GA', LEN_8_9, '06 12 34 56'),
  country('Gambia', '+220', 'GM', [7], '301 2345'),
  country('Georgia', '+995', 'GE', [9], '555 12 34 56'),
  country('Germany', '+49', 'DE', LEN_10_11, '151 23456789'),
  country('Ghana', '+233', 'GH', [9], '24 123 4567'),
  country('Greece', '+30', 'GR', [10], '691 234 5678'),
  country('Grenada', '+1', 'GD', LEN_10, '473 403 1234'),
  country('Guatemala', '+502', 'GT', [8], '5123 4567'),
  country('Guinea', '+224', 'GN', [9], '622 12 34 56'),
  country('Guinea-Bissau', '+245', 'GW', [9], '955 012 345'),
  country('Guyana', '+592', 'GY', [7], '609 1234'),
  country('Haiti', '+509', 'HT', [8], '34 10 1234'),
  country('Honduras', '+504', 'HN', [8], '9123 4567'),
  country('Hungary', '+36', 'HU', [9], '20 123 4567'),
  country('Iceland', '+354', 'IS', [7], '611 1234'),
  country('India', '+91', 'IN', LEN_10, '98765 43210'),
  country('Indonesia', '+62', 'ID', LEN_9_12, '812 3456 7890'),
  country('Iran', '+98', 'IR', [10], '912 345 6789'),
  country('Iraq', '+964', 'IQ', [10], '790 123 4567'),
  country('Ireland', '+353', 'IE', [9], '85 123 4567'),
  country('Israel', '+972', 'IL', [9], '50 123 4567'),
  country('Italy', '+39', 'IT', LEN_9_10, '312 345 6789'),
  country('Jamaica', '+1', 'JM', LEN_10, '876 210 1234'),
  country('Japan', '+81', 'JP', LEN_10, '90 1234 5678'),
  country('Jordan', '+962', 'JO', [9], '7 9012 3456'),
  country('Kazakhstan', '+7', 'KZ', LEN_10, '701 123 4567'),
  country('Kenya', '+254', 'KE', [9], '712 345678'),
  country('Kiribati', '+686', 'KI', [8], '7200 1234'),
  country('Kuwait', '+965', 'KW', [8], '500 12345'),
  country('Kyrgyzstan', '+996', 'KG', [9], '700 123 456'),
  country('Laos', '+856', 'LA', LEN_8_10, '20 5555 1234'),
  country('Latvia', '+371', 'LV', [8], '21 234 567'),
  country('Lebanon', '+961', 'LB', LEN_7_8, '71 123 456'),
  country('Lesotho', '+266', 'LS', [8], '5012 3456'),
  country('Liberia', '+231', 'LR', LEN_7_8, '77 012 345'),
  country('Libya', '+218', 'LY', [9], '91 234 5678'),
  country('Liechtenstein', '+423', 'LI', [7], '660 2345'),
  country('Lithuania', '+370', 'LT', [8], '612 34567'),
  country('Luxembourg', '+352', 'LU', [9], '621 123 456'),
  country('Madagascar', '+261', 'MG', [9], '32 12 345 67'),
  country('Malawi', '+265', 'MW', [9], '99 123 4567'),
  country('Malaysia', '+60', 'MY', LEN_9_10, '12 345 6789'),
  country('Maldives', '+960', 'MV', [7], '771 2345'),
  country('Mali', '+223', 'ML', [8], '65 12 34 56'),
  country('Malta', '+356', 'MT', [8], '9912 3456'),
  country('Marshall Islands', '+692', 'MH', [7], '235 1234'),
  country('Mauritania', '+222', 'MR', [8], '22 12 34 56'),
  country('Mauritius', '+230', 'MU', LEN_7_8, '5251 2345'),
  country('Mexico', '+52', 'MX', LEN_10, '55 1234 5678'),
  country('Micronesia', '+691', 'FM', [7], '350 1234'),
  country('Moldova', '+373', 'MD', [8], '69 123 456'),
  country('Monaco', '+377', 'MC', LEN_8_9, '6 12 34 56 78'),
  country('Mongolia', '+976', 'MN', [8], '8812 3456'),
  country('Montenegro', '+382', 'ME', [8], '67 123 456'),
  country('Morocco', '+212', 'MA', [9], '612 345678'),
  country('Mozambique', '+258', 'MZ', [9], '82 123 4567'),
  country('Myanmar', '+95', 'MM', LEN_8_10, '9 123 456789'),
  country('Namibia', '+264', 'NA', [9], '81 123 4567'),
  country('Nauru', '+674', 'NR', [7], '555 1234'),
  country('Nepal', '+977', 'NP', LEN_10, '984 1234567'),
  country('Netherlands', '+31', 'NL', [9], '6 12345678'),
  country('New Zealand', '+64', 'NZ', LEN_8_10, '21 123 4567'),
  country('Nicaragua', '+505', 'NI', [8], '8123 4567'),
  country('Niger', '+227', 'NE', [8], '93 12 34 56'),
  country('Nigeria', '+234', 'NG', LEN_10, '803 123 4567'),
  country('North Korea', '+850', 'KP', LEN_6_10, '191 234 5678'),
  country('North Macedonia', '+389', 'MK', [8], '70 123 456'),
  country('Norway', '+47', 'NO', [8], '406 12 345'),
  country('Oman', '+968', 'OM', [8], '9212 3456'),
  country('Pakistan', '+92', 'PK', LEN_10, '0300 1234567', {
    local_digit_lengths: [11],
    national_prefix: '0',
  }),
  country('Palau', '+680', 'PW', [7], '620 1234'),
  country('Palestine', '+970', 'PS', [9], '59 123 4567'),
  country('Panama', '+507', 'PA', [8], '6123 4567'),
  country('Papua New Guinea', '+675', 'PG', [8], '7012 3456'),
  country('Paraguay', '+595', 'PY', [9], '981 123456'),
  country('Peru', '+51', 'PE', [9], '912 345 678'),
  country('Philippines', '+63', 'PH', LEN_10, '917 123 4567'),
  country('Poland', '+48', 'PL', [9], '512 345 678'),
  country('Portugal', '+351', 'PT', [9], '912 345 678'),
  country('Qatar', '+974', 'QA', [8], '3312 3456'),
  country('Romania', '+40', 'RO', [9], '712 345 678'),
  country('Russia', '+7', 'RU', LEN_10, '912 345 6789'),
  country('Rwanda', '+250', 'RW', [9], '78 123 4567'),
  country('Saint Kitts and Nevis', '+1', 'KN', LEN_10, '869 765 1234'),
  country('Saint Lucia', '+1', 'LC', LEN_10, '758 284 1234'),
  country('Saint Vincent and the Grenadines', '+1', 'VC', LEN_10, '784 430 1234'),
  country('Samoa', '+685', 'WS', LEN_5_7, '72 12345'),
  country('San Marino', '+378', 'SM', LEN_6_10, '66 66 12 12'),
  country('Sao Tome and Principe', '+239', 'ST', [7], '981 2345'),
  country('Saudi Arabia', '+966', 'SA', [9], '50 123 4567'),
  country('Senegal', '+221', 'SN', [9], '77 123 45 67'),
  country('Serbia', '+381', 'RS', LEN_8_9, '60 1234567'),
  country('Seychelles', '+248', 'SC', [7], '2 510 123'),
  country('Sierra Leone', '+232', 'SL', [8], '76 123456'),
  country('Singapore', '+65', 'SG', [8], '8123 4567'),
  country('Slovakia', '+421', 'SK', [9], '912 123 456'),
  country('Slovenia', '+386', 'SI', [8], '31 234 567'),
  country('Solomon Islands', '+677', 'SB', [7], '74 21234'),
  country('Somalia', '+252', 'SO', LEN_7_9, '61 234 5678'),
  country('South Africa', '+27', 'ZA', [9], '82 123 4567'),
  country('South Korea', '+82', 'KR', LEN_9_10, '10 1234 5678'),
  country('South Sudan', '+211', 'SS', [9], '92 123 4567'),
  country('Spain', '+34', 'ES', [9], '612 345 678'),
  country('Sri Lanka', '+94', 'LK', [9], '71 234 5678'),
  country('Sudan', '+249', 'SD', [9], '91 123 4567'),
  country('Suriname', '+597', 'SR', LEN_6_7, '741 2345'),
  country('Sweden', '+46', 'SE', LEN_7_9, '70 123 45 67'),
  country('Switzerland', '+41', 'CH', [9], '78 123 45 67'),
  country('Syria', '+963', 'SY', [9], '944 567 890'),
  country('Taiwan', '+886', 'TW', [9], '912 345 678'),
  country('Tajikistan', '+992', 'TJ', [9], '92 123 4567'),
  country('Tanzania', '+255', 'TZ', [9], '712 345 678'),
  country('Thailand', '+66', 'TH', [9], '81 234 5678'),
  country('Timor-Leste', '+670', 'TL', LEN_7_8, '7721 2345'),
  country('Togo', '+228', 'TG', [8], '90 12 34 56'),
  country('Tonga', '+676', 'TO', LEN_5_7, '771 5123'),
  country('Trinidad and Tobago', '+1', 'TT', LEN_10, '868 291 1234'),
  country('Tunisia', '+216', 'TN', [8], '20 123 456'),
  country('Turkey', '+90', 'TR', [10], '501 234 5678'),
  country('Turkmenistan', '+993', 'TM', [8], '65 123456'),
  country('Tuvalu', '+688', 'TV', LEN_5_6, '901234'),
  country('Uganda', '+256', 'UG', [9], '712 345678'),
  country('Ukraine', '+380', 'UA', [9], '50 123 4567'),
  country('United Arab Emirates', '+971', 'AE', [9], '50 123 4567'),
  country('United Kingdom', '+44', 'GB', LEN_10, '7400 123456'),
  country('United States', '+1', 'US', LEN_10, '202 555 0147'),
  country('Uruguay', '+598', 'UY', [8], '94 123 456'),
  country('Uzbekistan', '+998', 'UZ', [9], '90 123 45 67'),
  country('Vanuatu', '+678', 'VU', LEN_5_7, '591 2345'),
  country('Vatican City', '+39', 'VA', LEN_6_10, '06 698 12345'),
  country('Venezuela', '+58', 'VE', [10], '412 123 4567'),
  country('Vietnam', '+84', 'VN', LEN_9_10, '91 234 56 78'),
  country('Yemen', '+967', 'YE', [9], '712 345 678'),
  country('Zambia', '+260', 'ZM', [9], '95 123 4567'),
  country('Zimbabwe', '+263', 'ZW', [9], '71 234 5678'),
]

export const DEFAULT_PHONE_COUNTRY =
  COUNTRY_PHONE_CODES.find((item) => item.iso2 === 'PK') || COUNTRY_PHONE_CODES[0]

export function getCountryByDialCode(dialCode) {
  return (
    COUNTRY_PHONE_CODES.find((countryOption) => countryOption.dial_code === dialCode) ||
    DEFAULT_PHONE_COUNTRY
  )
}

export function normalizeDialCode(value, fallback = DEFAULT_PHONE_COUNTRY.dial_code) {
  const dialCode = String(value || '').trim()
  return dialCode.startsWith('+') ? dialCode : fallback
}

export function findCountryForE164(value, defaultDialCode = DEFAULT_PHONE_COUNTRY.dial_code) {
  const text = String(value || '').trim()
  const fallback = getCountryByDialCode(normalizeDialCode(defaultDialCode))
  const sortedCountries = [...COUNTRY_PHONE_CODES].sort(
    (first, second) => second.dial_code.length - first.dial_code.length,
  )
  const matchedCountry = sortedCountries.find((countryOption) =>
    text.startsWith(countryOption.dial_code),
  )

  if (matchedCountry?.dial_code === '+1') {
    return COUNTRY_PHONE_CODES.find((countryOption) => countryOption.iso2 === 'US') || matchedCountry
  }

  if (matchedCountry?.dial_code === '+7') {
    return COUNTRY_PHONE_CODES.find((countryOption) => countryOption.iso2 === 'RU') || matchedCountry
  }

  return matchedCountry || fallback
}

export function splitE164PhoneValue(value, defaultDialCode = DEFAULT_PHONE_COUNTRY.dial_code) {
  const text = String(value || '').trim()
  const countryOption = findCountryForE164(text, defaultDialCode)
  const hasCountryPrefix = text.startsWith(countryOption.dial_code)
  const nationalNumber = hasCountryPrefix
    ? text.slice(countryOption.dial_code.length)
    : text.replace(/^\+/, '')

  return {
    country: countryOption,
    nationalNumber: normalizeNationalNumberForCountry(nationalNumber, countryOption),
  }
}

export function getAcceptedNationalDigitLengths(countryData) {
  const country = countryData || DEFAULT_PHONE_COUNTRY

  return uniqueSortedLengths([
    ...(country.digit_lengths || []),
    ...(country.local_digit_lengths || []),
  ])
}

export function normalizeNationalNumberForCountry(value, countryData) {
  const digits = String(value || '').replace(/\D/g, '')
  const country = countryData || DEFAULT_PHONE_COUNTRY

  if (!digits || !country) {
    return digits
  }

  const validLengths = country.digit_lengths || []
  const dialDigits = String(country.dial_code || '').replace(/\D/g, '')

  if (dialDigits && digits.startsWith(dialDigits)) {
    const withoutDialCode = digits.slice(dialDigits.length)

    if (validLengths.includes(withoutDialCode.length)) {
      return withoutDialCode
    }

    const withoutDialCodePrefix = stripNationalPrefix(withoutDialCode, country)

    if (validLengths.includes(withoutDialCodePrefix.length)) {
      return withoutDialCodePrefix
    }
  }

  if (validLengths.includes(digits.length)) {
    return digits
  }

  const withoutNationalPrefix = stripNationalPrefix(digits, country)

  if (validLengths.includes(withoutNationalPrefix.length)) {
    return withoutNationalPrefix
  }

  return digits
}

export function toLocalNationalNumberForCountry(value, countryData) {
  const country = countryData || DEFAULT_PHONE_COUNTRY
  const normalized = normalizeNationalNumberForCountry(value, country)

  if (!normalized || !country?.national_prefix) {
    return normalized
  }

  const localValue = `${country.national_prefix}${normalized}`

  return (country.local_digit_lengths || []).includes(localValue.length)
    ? localValue
    : normalized
}

function stripNationalPrefix(value, countryData) {
  const digits = String(value || '').replace(/\D/g, '')
  const prefix = countryData?.national_prefix

  if (!prefix || !digits.startsWith(prefix)) {
    return digits
  }

  return digits.slice(prefix.length)
}
