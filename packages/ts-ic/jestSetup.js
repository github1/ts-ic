global.testLog = (...message) => {
  try {
    message = JSON.stringify(message, null, 2);
  } catch (err) {
    message = message.join(' ');
  }
  require('fs').appendFileSync('/tmp/ts-ic.log', message + '\n');
};
