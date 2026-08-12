const phone = "9849910422";
const sock = { user: { id: "919000000000:4@s.whatsapp.net" } };
let clean = phone.replace(/[^0-9]/g, '');

if (clean.length === 10 && sock?.user?.id) {
  const userJidClean = sock.user.id.split(':')[0].split('@')[0];
  if (userJidClean.length > 10) {
    const cc = userJidClean.substring(0, userJidClean.length - 10);
    clean = cc + clean;
  } else {
    clean = '1' + clean; // fallback
  }
} else if (clean.length === 10) {
  clean = '1' + clean; // fallback
}

console.log(`${clean}@s.whatsapp.net`);
