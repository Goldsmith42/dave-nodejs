import * as fs from 'fs';
import * as path from 'path';

import { getAssetsDir } from '../common/file-utils';
import { getExeReader } from './utils';
import { BinaryFileReader } from '../common/binary-file-reader';

const TITLE_ADDRESS = 0x2643f;
const TITLE_MAX_LENGTH = 0xe;
const SUBTITLE_ADDRESS = 0x26451;
const SUBTITLE_MAX_LENGTH = 0x17;
const HELP_PROMPT_ADDRESS = 0x2646b;
const HELP_PROMPT_MAX_LENGTH = 25;

async function writeTextToFile(reader: BinaryFileReader, addr: number, maxLength: number, filename: string) {
  fs.writeFileSync(
    path.join(getAssetsDir('text/'), filename),
    await reader.seek(addr).readString(maxLength),
    { encoding: 'ascii' }
  );
}

export async function main() {
  using reader = getExeReader(process.argv[2]);
  await writeTextToFile(reader, TITLE_ADDRESS, TITLE_MAX_LENGTH, 'title.txt');
  await writeTextToFile(reader, SUBTITLE_ADDRESS, SUBTITLE_MAX_LENGTH, 'subtitle.txt');
  await writeTextToFile(reader, HELP_PROMPT_ADDRESS, HELP_PROMPT_MAX_LENGTH, 'helpprompt.txt');
}

main();