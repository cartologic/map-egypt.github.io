'use strict';
import numeral from 'numeral';

const tally = (n) => numeral(n).format('0,0');
module.exports.tally = tally;

const shortTally = (n) => {
  if (n >= 1000000) {
    return numeral(n / 1000000).format('0,0.[00]') + 'M';
  } else if (n >= 1000) {
    return numeral(n / 1000).format('0,0.[00]') + 'K';
  }
  return tally(n);
};
module.exports.shortTally = shortTally;

function pct (n) {
  if (n || typeof n === 'number') {
    return n + '%';
  }
  return n;
}
module.exports.pct = pct;

function shortText (s, length) {
  length = length || 20;
  return s.slice(0, length) + '...';
}
module.exports.shortText = shortText;

function shortParagraph (s, wordCountTarget) {
  wordCountTarget = wordCountTarget || 25;
  let result = s.split(' ');
  let suffix = '';
  if (result.length > wordCountTarget) {
    result = result.slice(0, wordCountTarget);
    suffix = '...';
  }
  return result.join(' ') + suffix;
}
module.exports.shortParagraph = shortParagraph;
