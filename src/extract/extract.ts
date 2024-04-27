import { main as extractText } from './extract-text';
import { main as extractTiles } from './extract-tiles';
import { main as extractLevels } from './extract-levels';

extractTiles().then(() => {
  console.log('Extracted tiles');
  return extractLevels();
}).then(() => {
  console.log('Extracted levels');
  return extractText();
}).then(() => {
  console.log('Extracted text');
});
