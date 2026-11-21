// Vendored copy of Dexie 4.0.11 so the app loads offline and never picks up an
// unexpected major version from a CDN.
import Dexie from './vendor/dexie.mjs';

// Naming convention: "Movement, qualifier, qualifier" in sentence case.
// Qualifiers go in the order equipment, attachment/grip, other. Equipment is
// only named when the movement is done with more than one kind. See EXERCISES.md.
const SEED_EXERCISES = [
  { name: 'Bench press, barbell', group: 'Upper Push', type: 'Reps' },
  { name: 'Bench press, dumbbell', group: 'Upper Push', type: 'Reps' },
  { name: 'Incline bench press, barbell', group: 'Upper Push', type: 'Reps' },
  { name: 'Incline bench press, dumbbell', group: 'Upper Push', type: 'Reps' },
  { name: 'Incline fly, dumbbell', group: 'Upper Push', type: 'Reps' },
  { name: 'Chest press', group: 'Upper Push', type: 'Reps' },
  { name: 'Chest fly, cable', group: 'Upper Push', type: 'Reps' },
  { name: 'Overhead press, barbell', group: 'Upper Push', type: 'Reps' },
  { name: 'Overhead press, dumbbell', group: 'Upper Push', type: 'Reps' },
  { name: 'Lateral raise, dumbbell', group: 'Upper Push', type: 'Reps' },
  { name: 'Dip', group: 'Upper Push', type: 'Reps' },
  { name: 'Pushup', group: 'Upper Push', type: 'Reps' },
  { name: 'Pushup, clap', group: 'Upper Push', type: 'Reps' },
  { name: 'Triceps extension, machine', group: 'Upper Push', type: 'Reps' },
  { name: 'Triceps overhead extension, rope', group: 'Upper Push', type: 'Reps' },
  { name: 'Triceps pushdown, rope', group: 'Upper Push', type: 'Reps' },
  { name: 'Triceps pushdown, straight bar', group: 'Upper Push', type: 'Reps' },
  { name: 'Lat pulldown, wide grip', group: 'Upper Pull', type: 'Reps' },
  { name: 'Lat pulldown, close grip', group: 'Upper Pull', type: 'Reps' },
  { name: 'Cable row, close grip', group: 'Upper Pull', type: 'Reps' },
  { name: 'Cable row, wide grip', group: 'Upper Pull', type: 'Reps' },
  { name: 'Cable row, separate grips', group: 'Upper Pull', type: 'Reps' },
  { name: 'Biceps curl, barbell', group: 'Upper Pull', type: 'Reps' },
  { name: 'Biceps curl, dumbbell', group: 'Upper Pull', type: 'Reps' },
  { name: 'Biceps curl, machine', group: 'Upper Pull', type: 'Reps' },
  { name: 'Face pull, rope', group: 'Upper Pull', type: 'Reps' },
  { name: 'Face pull, separate grips', group: 'Upper Pull', type: 'Reps' },
  { name: 'Reverse fly, machine', group: 'Upper Pull', type: 'Reps' },
  { name: 'Chin-up', group: 'Upper Pull', type: 'Reps' },
  { name: 'Squat, barbell', group: 'Legs', type: 'Reps' },
  { name: 'Squat, goblet', group: 'Legs', type: 'Reps' },
  { name: 'Squat, Bulgarian split', group: 'Legs', type: 'Reps' },
  { name: 'Leg press', group: 'Legs', type: 'Reps' },
  { name: 'Leg press, single-leg', group: 'Legs', type: 'Reps' },
  { name: 'Calf press', group: 'Legs', type: 'Reps' },
  { name: 'Calf press, single-leg', group: 'Legs', type: 'Reps' },
  { name: 'Calf raise, seated', group: 'Legs', type: 'Reps' },
  { name: 'Calf raise, standing', group: 'Legs', type: 'Reps' },
  { name: 'Hip abduction', group: 'Legs', type: 'Reps' },
  { name: 'Hip adduction', group: 'Legs', type: 'Reps' },
  { name: 'Ankle cable', group: 'Legs', type: 'Reps' },
  { name: 'Ab crunch, machine', group: 'Front core', type: 'Reps' },
  { name: 'Leg raise, bent knee', group: 'Front core', type: 'Reps' },
  { name: 'Leg raise, straight', group: 'Front core', type: 'Reps' },
  { name: 'Plank', group: 'Front core', type: 'Duration' },
  { name: 'Plank, side', group: 'Front core', type: 'Duration' },
  { name: 'Torso rotation, machine', group: 'Front core', type: 'Reps' },
  { name: 'Back extension, machine', group: 'Back core', type: 'Reps' },
  { name: 'Back extension, Roman chair', group: 'Back core', type: 'Reps' },
  { name: 'Back extension hold, Roman chair', group: 'Back core', type: 'Duration' },
  { name: 'Spine lift, dumbbell', group: 'Back core', type: 'Reps' },
];

// Old name -> new name, from the naming cleanup. Used by the version 4 database
// upgrade and when importing backups made before it. Never remove entries:
// old backup files may still use these names.
const RENAMES = {
  'Bench press': 'Bench press, barbell',
  'Dumbbell bench press': 'Bench press, dumbbell',
  'Inclined bench press': 'Incline bench press, barbell',
  'Dumbbell incline press': 'Incline bench press, dumbbell',
  'Dumbbell incline fly': 'Incline fly, dumbbell',
  'Chest press, machine': 'Chest press',
  'Cable chest': 'Chest fly, cable',
  'Press': 'Overhead press, barbell',
  'Dumbbell press': 'Overhead press, dumbbell',
  'Dumbbell shoulder fly': 'Lateral raise, dumbbell',
  'Dips': 'Dip',
  'Tricep extension, machine': 'Triceps extension, machine',
  'Tricep extension, up, with rope': 'Triceps overhead extension, rope',
  'Tricep extension, down, with rope': 'Triceps pushdown, rope',
  'Tricep extension, down, with straight handle': 'Triceps pushdown, straight bar',
  'Lateral pull-down, wide-grip': 'Lat pulldown, wide grip',
  'Pull-down, close grip': 'Lat pulldown, close grip',
  'Barbell bicep curl': 'Biceps curl, barbell',
  'Dumbbell bicep curl': 'Biceps curl, dumbbell',
  'Machine bicep curl': 'Biceps curl, machine',
  'Face pull, with rope': 'Face pull, rope',
  'Face Pull, separate grips': 'Face pull, separate grips',
  'Rear deltoid machine': 'Reverse fly, machine',
  'Squat': 'Squat, barbell',
  'Goblet squat': 'Squat, goblet',
  'Bulgarian split squat': 'Squat, Bulgarian split',
  'Single-leg leg press': 'Leg press, single-leg',
  'Single-leg calf press': 'Calf press, single-leg',
  'Seated calf raise': 'Calf raise, seated',
  'Standing calf raise': 'Calf raise, standing',
  'Abduction machine': 'Hip abduction',
  'Adduction machine': 'Hip adduction',
  'Ab crunch machine': 'Ab crunch, machine',
  'Knee raise': 'Leg raise, bent knee',
  'Straight leg raise - from elbows': 'Leg raise, straight',
  'Side plank': 'Plank, side',
  'Torso rotation': 'Torso rotation, machine',
  'Back extension machine': 'Back extension, machine',
  'Roman chair': 'Back extension, Roman chair',
  'Roman hold': 'Back extension hold, Roman chair',
};

function currentName(name) {
  return RENAMES[name] ?? name;
}

// Seed-list entry for a name, old or new.
function seedFor(name) {
  const wanted = currentName(name);
  return SEED_EXERCISES.find(s => s.name === wanted);
}

const GROUPS = ['Upper Push', 'Upper Pull', 'Legs', 'Front core', 'Back core'];

// The old single 'Core' group was split in two. Exercises from the seed list go
// where the list puts them; any other (user-added) Core exercise goes to Front core.
function splitCoreGroup(name) {
  return seedFor(name)?.group ?? 'Front core';
}

const db = new Dexie('ExerciseTrackerDB');

db.version(1).stores({
  exercises: '++id, name, group, type',
  entries: '++id, exerciseId, date',
});

// Migrate entries to use exerciseName (string) instead of exerciseId (number)
db.version(2).stores({
  exercises: '++id, name, group, type',
  entries: '++id, exerciseName, date',
}).upgrade(async tx => {
  const exercises = await tx.table('exercises').toArray();
  const idToName = Object.fromEntries(exercises.map(e => [e.id, e.name]));
  await tx.table('entries').toCollection().modify(entry => {
    if (entry.exerciseId !== undefined) {
      entry.exerciseName = idToName[entry.exerciseId] ?? null;
      delete entry.exerciseId;
    }
  });
});

// Split the 'Core' group into 'Front core' and 'Back core', and remove duplicate
// exercise records left over from before duplicate names were blocked.
// Entries reference exercises by name, so only the exercises table changes and
// no logged workouts are touched.
db.version(3).stores({
  exercises: '++id, name, group, type',
  entries: '++id, exerciseName, date',
}).upgrade(async tx => {
  const table = tx.table('exercises');
  await table.where('group').equals('Core').modify(ex => {
    ex.group = splitCoreGroup(ex.name);
  });

  // For a duplicated name, keep the record whose group matches the seed list
  // (or the oldest one if none does) and delete the rest.
  const byName = {};
  for (const ex of await table.toArray()) (byName[ex.name] ||= []).push(ex);
  const extraIds = [];
  for (const [name, copies] of Object.entries(byName)) {
    if (copies.length < 2) continue;
    const seedGroup = seedFor(name)?.group;
    const keep = copies.find(c => c.group === seedGroup) ?? copies.sort((a, b) => a.id - b.id)[0];
    extraIds.push(...copies.filter(c => c !== keep).map(c => c.id));
  }
  await table.bulkDelete(extraIds);
});

// Rename exercises to the standard naming convention (see RENAMES), in both the
// exercises table and every logged entry, so history stays attached.
db.version(4).stores({
  exercises: '++id, name, group, type',
  entries: '++id, exerciseName, date',
}).upgrade(async tx => {
  const exercises = tx.table('exercises');
  const existingNames = new Set((await exercises.toArray()).map(e => e.name));
  const extraIds = [];
  await exercises.toCollection().modify(ex => {
    const newName = RENAMES[ex.name];
    if (!newName) return;
    if (existingNames.has(newName)) {
      // Someone already added an exercise with the new name: keep that one.
      extraIds.push(ex.id);
      return;
    }
    existingNames.add(newName);
    ex.name = newName;
  });
  await exercises.bulkDelete(extraIds);

  await tx.table('entries')
    .where('exerciseName').anyOf(Object.keys(RENAMES))
    .modify(entry => { entry.exerciseName = RENAMES[entry.exerciseName]; });
});

export async function initDb() {
  const existing = await db.exercises.toArray();
  const existingNames = new Set(existing.map(e => e.name));
  const toAdd = SEED_EXERCISES.filter(e => !existingNames.has(e.name));
  if (toAdd.length) {
    await db.exercises.bulkAdd(toAdd);
  }
}

export async function getExercises() {
  return await db.exercises.orderBy('name').toArray();
}

export class DuplicateExerciseError extends Error {}

export async function addExercise(exercise) {
  const wanted = exercise.name.toLowerCase();
  const clash = await db.exercises.filter(e => e.name.toLowerCase() === wanted).first();
  if (clash) throw new DuplicateExerciseError(`"${clash.name}" already exists`);
  return await db.exercises.add(exercise);
}

// Next free position for a day. Uses the highest existing position rather than
// the entry count, so deleting an entry never causes two entries to share a number.
async function nextOrderPosition(date) {
  const entries = await db.entries.where('date').equals(date).toArray();
  return entries.reduce((max, e) => Math.max(max, e.orderPosition || 0), 0) + 1;
}

export async function addEntry({ exerciseName, date, sets }) {
  return await db.transaction('rw', db.entries, async () => {
    const orderPosition = await nextOrderPosition(date);
    return await db.entries.add({ exerciseName, date, orderPosition, sets });
  });
}

export async function getEntriesForDate(date) {
  return await db.entries.where('date').equals(date).toArray();
}

export async function getAllEntryDates() {
  const entries = await db.entries.toArray();
  const dates = [...new Set(entries.map(e => e.date))];
  return dates.sort((a, b) => b.localeCompare(a));
}

export async function getAllEntries() {
  return await db.entries.toArray();
}

export async function getRecentEntriesForExercise(exerciseName, limit = 2) {
  const all = await db.entries.where('exerciseName').equals(exerciseName).toArray();
  return all
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, limit);
}

export async function updateEntry(id, data) {
  await db.transaction('rw', db.entries, async () => {
    const current = await db.entries.get(id);
    if (!current) return;
    const changes = { ...data };
    // Moving an entry to another day puts it at the end of that day.
    if (data.date && data.date !== current.date) {
      changes.orderPosition = await nextOrderPosition(data.date);
    }
    await db.entries.update(id, changes);
  });
}

export async function deleteEntry(id) {
  await db.entries.delete(id);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ['Reps', 'Duration'];

// Accept backups made before the Core split. `name` is the already-renamed name.
function importedGroup(ex, name) {
  if (GROUPS.includes(ex.group)) return ex.group;
  if (ex.group === 'Core') return splitCoreGroup(name);
  return 'Front core';
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Keep only well-formed sets, with numeric fields only.
function cleanSets(sets) {
  if (!Array.isArray(sets)) return [];
  const cleaned = [];
  for (const s of sets) {
    const reps = toNumber(s?.reps);
    const timeSeconds = toNumber(s?.timeSeconds);
    const weightLbs = toNumber(s?.weightLbs) ?? 0;
    if (reps !== undefined) cleaned.push({ reps, weightLbs });
    else if (timeSeconds !== undefined) cleaned.push({ timeSeconds, weightLbs });
  }
  return cleaned;
}

// Identifies an entry by its content, so importing the same file twice is harmless.
function entryKey(e) {
  return `${e.date}|${e.exerciseName}|${JSON.stringify(e.sets)}`;
}

export async function importData({ exercises: importedExercises = [], entries: importedEntries = [] }) {
  // One transaction: if anything fails, nothing is imported.
  return await db.transaction('rw', db.exercises, db.entries, async () => {
    const existing = await db.exercises.toArray();
    const existingNames = new Set(existing.map(e => e.name));
    const lowerNames = new Set(existing.map(e => e.name.toLowerCase()));

    const newExercises = [];
    for (const ex of importedExercises) {
      // Backups made before the naming cleanup use old names; translate them.
      const name = typeof ex?.name === 'string' ? currentName(ex.name.trim()) : '';
      if (!name || lowerNames.has(name.toLowerCase())) continue;
      newExercises.push({
        name,
        group: importedGroup(ex, name),
        type: TYPES.includes(ex.type) ? ex.type : 'Reps',
      });
      existingNames.add(name);
      lowerNames.add(name.toLowerCase());
    }
    await db.exercises.bulkAdd(newExercises);

    const allEntries = await db.entries.toArray();
    const seen = new Set(allEntries.map(entryKey));
    const nextPosition = {};
    for (const e of allEntries) {
      nextPosition[e.date] = Math.max(nextPosition[e.date] || 1, (e.orderPosition || 0) + 1);
    }

    const sorted = importedEntries
      .filter(e => typeof e?.date === 'string' && DATE_RE.test(e.date))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.orderPosition || 0) - (b.orderPosition || 0));

    const newEntries = [];
    for (const entry of sorted) {
      // Support both new format (exerciseName) and old format (exerciseId + exercises array)
      let exerciseName = entry.exerciseName;
      if (!exerciseName && entry.exerciseId !== undefined) {
        exerciseName = importedExercises.find(e => e.id === entry.exerciseId)?.name;
      }
      if (typeof exerciseName === 'string') exerciseName = currentName(exerciseName.trim());
      if (!exerciseName || !existingNames.has(exerciseName)) continue;

      const sets = cleanSets(entry.sets);
      if (!sets.length) continue;

      const candidate = { exerciseName, date: entry.date, sets };
      const key = entryKey(candidate);
      if (seen.has(key)) continue;
      seen.add(key);

      const orderPosition = nextPosition[entry.date] || 1;
      nextPosition[entry.date] = orderPosition + 1;
      newEntries.push({ ...candidate, orderPosition });
    }
    await db.entries.bulkAdd(newEntries);

    return { newExerciseCount: newExercises.length, entryCount: newEntries.length };
  });
}

// Ask the browser not to clear this app's data when the device is low on space.
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (e) {
    console.warn('Persistent storage request failed', e);
  }
}

export default db;
