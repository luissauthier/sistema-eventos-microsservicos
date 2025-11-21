/**
 * Gera uma senha aleatória forte para usuários offline.
 * Formato: Letras + Números + Símbolo (ex: Xk9#mP2!)
 */
function generateTempPassword(length = 8) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const specials = "!@#$%&*";
  let retVal = "";
  
  retVal += specials.charAt(Math.floor(Math.random() * specials.length));
  
  for (let i = 0, n = charset.length; i < length - 1; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  
  return retVal.split('').sort(() => 0.5 - Math.random()).join('');
}

module.exports = { generateTempPassword };