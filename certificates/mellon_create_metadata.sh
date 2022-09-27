#!/usr/bin/env bash
# @see: https://github.com/UNINETT/mod_auth_mellon/blob/master/mellon_create_metadata.sh
set -e

PROG="$(basename "$0")"

ENTITYID="virtual-finland-development"
BASEURL="https://q88uo5prmh.execute-api.eu-north-1.amazonaws.com"
PUBLIC_SITE_HOST="https://virtual-finland-development-auth-files.s3.eu-north-1.amazonaws.com"

if ! echo "${BASEURL}" | grep -q '^https\?://'; then
    echo "$PROG: The URL must start with \"http://\" or \"https://\"." >&2
    exit 1
fi

HOST="$(echo "${BASEURL}" | sed 's#^[a-z]*://\([^:/]*\).*#\1#')"
BASEURL="$(echo "${BASEURL}" | sed 's#/$##')"

LOGOUT_URL="${BASEURL}/auth/saml2/logout"
LOGIN_CALLBACK_URL="${BASEURL}/auth/saml2/authenticate-response"

OUTFILE="$(echo "${ENTITYID}" | sed 's/[^0-9A-Za-z.]/_/g' | sed 's/__*/_/g')"
echo "Output files:"
echo "Private key:               ${OUTFILE}.key"
echo "Certificate:               ${OUTFILE}.cert"
echo "Metadata:                  ${OUTFILE}.xml"
echo "Host:                      $HOST"
echo
echo "Endpoints:"
echo "SingleLogoutService:       ${LOGOUT_URL}"
echo "AssertionConsumerService:  ${LOGIN_CALLBACK_URL}"
echo

# No files should not be readable by the rest of the world.
umask 0077

if [ -f "${OUTFILE}.key" ]; then
    echo "$PROG: Using existing cert file: \"${OUTFILE}.key\"." >&2
else
TEMPLATEFILE="$(mktemp -t mellon_create_sp.XXXXXXXXXX)"
RANDFILE=./randfile 
dd if=/dev/urandom of=${RANDFILE} bs=256 count=1 2>/dev/null

cat >"${TEMPLATEFILE}" <<EOF
RANDFILE           = ./randfile
[req]
default_bits       = 2048
default_keyfile    = privkey.pem
distinguished_name = req_distinguished_name
prompt             = no
policy             = policy_anything
[req_distinguished_name]
commonName         = $HOST
EOF

openssl req -utf8 -batch -config "${TEMPLATEFILE}" -new -x509 -days 3652 -nodes -out "${OUTFILE}.cert" -keyout "${OUTFILE}.key" 2>/dev/null

rm "${RANDFILE}"
rm -f "${TEMPLATEFILE}"
fi

CERT="$(grep -v '^-----' "${OUTFILE}.cert")"

##
# @see: https://palveluhallinta.suomi.fi/fi/tuki/artikkelit/5a814d109ea47311bfd599a3
##
cat >"${OUTFILE}.xml" <<EOF
<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${BASEURL}">
  <md:Extensions xmlns:alg="urn:oasis:names:tc:SAML:metadata:algsupport">
    <mdattr:EntityAttributes xmlns:mdattr="urn:oasis:names:tc:SAML:metadata:attribute">
      <saml:Attribute xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" Name="FinnishAuthMethod" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
 	      <saml:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">http://ftn.ficora.fi/2017/loa3</saml:AttributeValue>
        <saml:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">http://eidas.europa.eu/LoA/high</saml:AttributeValue>
 	      <saml:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">http://ftn.ficora.fi/2017/loa2</saml:AttributeValue>
 	      <saml:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">http://eidas.europa.eu/LoA/substantial</saml:AttributeValue>
        <saml:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">urn:oid:1.2.246.517.3002.110.999</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" FriendlyName="VtjVerificationRequired" Name="urn:oid:1.2.246.517.3003.111.3" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">true</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" FriendlyName="SkipEndpointValidationWhenSigned" Name="urn:oid:1.2.246.517.3003.111.4" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">false</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" FriendlyName="EidasSupport" Name="urn:oid:1.2.246.517.3003.111.14" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">full</saml:AttributeValue>
      </saml:Attribute>

      <saml:Attribute xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" FriendlyName="CipherName" Name="urn:oid:1.2.246.517.3003.111.26" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="xs:string">AES-GCM</saml:AttributeValue>
      </saml:Attribute>
    </mdattr:EntityAttributes>
  </md:Extensions>
  <md:SPSSODescriptor AuthnRequestsSigned="true" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:Extensions>
      <mdui:UIInfo xmlns:mdui="urn:oasis:names:tc:SAML:metadata:ui">
        <mdui:DisplayName xml:lang="fi">Virtual Finland Development - Tunnistautuminen</mdui:DisplayName>
        <mdui:DisplayName xml:lang="sv">Virtual Finland Development - Autentisering</mdui:DisplayName>
        <mdui:DisplayName xml:lang="en">Virtual Finland Development - Authentication</mdui:DisplayName>
        <mdui:Logo height="54" width="327">${PUBLIC_SITE_HOST}/logo.png</mdui:Logo>
        <mdui:Description xml:lang="fi">VFD tunnistautumiskokeilu</mdui:Description>
        <mdui:Description xml:lang="sv">VFD identifieringsexperiment</mdui:Description>
        <mdui:Description xml:lang="en">VFD identification experiment</mdui:Description>
        <mdui:PrivacyStatementURL xml:lang="fi">${PUBLIC_SITE_HOST}/terms-of-service.html</mdui:PrivacyStatementURL>
        <mdui:PrivacyStatementURL xml:lang="sv">${PUBLIC_SITE_HOST}/terms-of-service.html</mdui:PrivacyStatementURL>
        <mdui:PrivacyStatementURL xml:lang="en">${PUBLIC_SITE_HOST}/terms-of-service.html</mdui:PrivacyStatementURL>
      </mdui:UIInfo>
    </md:Extensions>
    <md:KeyDescriptor>
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${CERT}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${LOGOUT_URL}"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${LOGOUT_URL}"/>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${LOGIN_CALLBACK_URL}" index="1" isDefault="true"/>
    <md:AttributeConsumingService index="1" isDefault="true">
      <md:ServiceName xml:lang="fi">Tunnistautuminen</md:ServiceName>
      <md:ServiceName xml:lang="sv">Autentisering</md:ServiceName>
      <md:ServiceName xml:lang="en">Authentication</md:ServiceName>
      <md:RequestedAttribute FriendlyName="kid" Name="urn:oid:1.2.246.517.3003.113.4" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="FirstName" Name="http://eidas.europa.eu/attributes/naturalperson/CurrentGivenName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="nationalIdentificationNumber" Name="urn:oid:1.2.246.21" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="displayName" Name="urn:oid:2.16.840.1.113730.3.1.241" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="cn" Name="urn:oid:2.5.4.3" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="sn" Name="urn:oid:2.5.4.4" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="givenName" Name="urn:oid:2.5.4.42" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenUlkomainenLahiosoite" Name="urn:oid:1.2.246.517.2002.2.11" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenUlkomainenLahiosoitePaikkakuntaJaValtioS" Name="urn:oid:1.2.246.517.2002.2.12" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenUlkomainenLahiosoitePaikkakuntaJaValtioR" Name="urn:oid:1.2.246.517.2002.2.13" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenUlkomainenLahiosoitePaikkakuntaJaValtioSelvakielinen" Name="urn:oid:1.2.246.517.2002.2.14" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenUlkomainenLahiosoiteValtiokoodi3" Name="urn:oid:1.2.246.517.2002.2.15" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="KotikuntaKuntanumero" Name="urn:oid:1.2.246.517.2002.2.18" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="KotikuntaKuntaS" Name="urn:oid:1.2.246.517.2002.2.19" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="KotikuntaKuntaR" Name="urn:oid:1.2.246.517.2002.2.20" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenKotimainenLahiosoiteS" Name="urn:oid:1.2.246.517.2002.2.4" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenKotimainenLahiosoiteR" Name="urn:oid:1.2.246.517.2002.2.5" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenKotimainenLahiosoitePostinumero" Name="urn:oid:1.2.246.517.2002.2.6" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenKotimainenLahiosoitePostitoimipaikkaS" Name="urn:oid:1.2.246.517.2002.2.7" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="VakinainenKotimainenLahiosoitePostitoimipaikkaR" Name="urn:oid:1.2.246.517.2002.2.8" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="mail" Name="urn:oid:0.9.2342.19200300.100.1.3" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="TurvakieltoTieto" Name="urn:oid:1.2.246.517.2002.2.27" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="FamilyName" Name="http://eidas.europa.eu/attributes/naturalperson/CurrentFamilyName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="DateOfBirth" Name="http://eidas.europa.eu/attributes/naturalperson/DateOfBirth" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
      <md:RequestedAttribute FriendlyName="PersonIdentifier" Name="http://eidas.europa.eu/attributes/naturalperson/PersonIdentifier" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri"/>
    </md:AttributeConsumingService>
  </md:SPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="fi">Virtual Finland Development</md:OrganizationName>
    <md:OrganizationName xml:lang="sv">Virtual Finland Development</md:OrganizationName>
    <md:OrganizationName xml:lang="en">Virtual Finland Development</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="fi">Virtual Finland Development</md:OrganizationDisplayName>
    <md:OrganizationDisplayName xml:lang="sv">Virtual Finland Development</md:OrganizationDisplayName>
    <md:OrganizationDisplayName xml:lang="en">Virtual Finland Development</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="fi">${PUBLIC_SITE_HOST}/index.html</md:OrganizationURL>
    <md:OrganizationURL xml:lang="sv">${PUBLIC_SITE_HOST}/index.html</md:OrganizationURL>
    <md:OrganizationURL xml:lang="en">${PUBLIC_SITE_HOST}/index.html</md:OrganizationURL>
  </md:Organization>
  <md:ContactPerson contactType="technical">
    <md:GivenName>Lassi</md:GivenName>
    <md:SurName>Piironen</md:SurName>
    <md:EmailAddress>mailto:lassi.piironen@sleek.works</md:EmailAddress>
  </md:ContactPerson>
</md:EntityDescriptor>
EOF

umask 0777
chmod go+r "${OUTFILE}.xml"
chmod go+r "${OUTFILE}.cert"
