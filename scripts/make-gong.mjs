#!/usr/bin/env node
// Synthesizes a gong strike into src/assets/gong.wav.
//
// Dependency-free: only Node's fs/Buffer/path are used, so the resulting
// audio's provenance is exactly this script, committed alongside it — no
// external file is downloaded or copied.
//
// A gong is inharmonic: unlike a string or an air column, its spectrum is
// not a stack of integer-multiple overtones but a handful of partials at
// non-integer ratios of the fundamental, each ringing out at its own rate,
// with the higher, brighter partials fading fastest. That leaves a bright
// transient at the strike and a long, low hum after it. This script
// approximates that shape as a sum of independently-decaying sinusoids,
// with a short linear attack ramp so the onset does not click.
//
// Run with: node scripts/make-gong.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SAMPLE_RATE = 44100;
const DURATION_S = 2.5;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;

const FUNDAMENTAL_HZ = 180;

// [ratio to the fundamental, relative amplitude, decay rate in nepers/s].
// Higher partials are quieter and decay faster, as on a struck metal gong.
const PARTIALS = [
  { ratio: 1.0, amplitude: 1.0, decay: 1.1 },
  { ratio: 2.7, amplitude: 0.55, decay: 2.4 },
  { ratio: 5.4, amplitude: 0.32, decay: 4.3 },
  { ratio: 8.9, amplitude: 0.18, decay: 7.0 },
];

const ATTACK_MS = 8;
const TARGET_PEAK_DBFS = -3;

function synthesize() {
  const numSamples = Math.round(SAMPLE_RATE * DURATION_S);
  const samples = new Float64Array(numSamples);
  const attackSamples = Math.round((ATTACK_MS / 1000) * SAMPLE_RATE);

  let peak = 0;
  for (let n = 0; n < numSamples; n++) {
    const t = n / SAMPLE_RATE;
    let value = 0;
    for (const { ratio, amplitude, decay } of PARTIALS) {
      const freq = FUNDAMENTAL_HZ * ratio;
      value += amplitude * Math.exp(-decay * t) * Math.sin(2 * Math.PI * freq * t);
    }
    // Linear attack ramp: the strike is not instantaneous, so ramping the
    // first few milliseconds up from silence avoids a sample-0 discontinuity
    // (a click) while leaving the sustain and decay untouched.
    const envelope = n < attackSamples ? n / attackSamples : 1;
    value *= envelope;
    samples[n] = value;
    const abs = Math.abs(value);
    if (abs > peak) peak = abs;
  }

  // Normalise so the true peak sits at TARGET_PEAK_DBFS.
  const targetPeak = Math.pow(10, TARGET_PEAK_DBFS / 20);
  const gain = peak > 0 ? targetPeak / peak : 1;

  const pcm = new Int16Array(numSamples);
  for (let n = 0; n < numSamples; n++) {
    const normalized = Math.max(-1, Math.min(1, samples[n] * gain));
    pcm[n] = Math.round(normalized * 32767);
  }
  return pcm;
}

function writeWavFile(filePath, pcm) {
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const dataSize = pcm.length * bytesPerSample;
  const byteRate = SAMPLE_RATE * CHANNELS * bytesPerSample;
  const blockAlign = CHANNELS * bytesPerSample;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // fmt chunk size (PCM)
  header.writeUInt16LE(1, 20); // audio format: 1 = PCM
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  const dataBuffer = Buffer.alloc(dataSize);
  for (let i = 0; i < pcm.length; i++) {
    dataBuffer.writeInt16LE(pcm[i], i * bytesPerSample);
  }

  writeFileSync(filePath, Buffer.concat([header, dataBuffer]));
}

const outPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'assets',
  'gong.wav',
);

const pcm = synthesize();
writeWavFile(outPath, pcm);

console.log(`Wrote ${outPath}`);
console.log(`Samples: ${pcm.length}, duration: ${(pcm.length / SAMPLE_RATE).toFixed(3)}s`);
