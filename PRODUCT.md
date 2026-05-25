# Product Overview

This app is for recording workouts, tracking progress over time, and ensuring a balanced set of exercises across changing workouts. The app should be easy to use during a session and should let the user review past performance for each exercise.

# Definitions

## Exercise
A specific motion, movement pattern, or static position designed to work a set of muscles. Exercises can be added by the user and each exercise belongs to exactly one exercise group.

## Exercise group
A fixed set of groups that represent general body areas:
- Upper Push
- Upper Pull
- Legs
- Core

## Set
One unit of work for an exercise. A set is either:
- reps-based: a number of repetitions, or
- time-based: a duration in seconds.

Each exercise entry can contain one or more sets, and sets may have different reps, duration, and/or weight.

## Repetition
The number of times an exercise movement is completed within a reps-based set. Abbreviated as “reps.” Not used for a time-based set.

## Set time
The duration of a time-based set, measured in seconds. Abbreviated as “s.” Not used for a reps-based set.

## Weight
The amount of weight used during a set, measured in pounds (`lbs`). Weight is optional and may come from a cable, barbell, dumbbell, or other source.

## Date
The day on which the exercise was performed. The app should treat the date as a calendar day, not a timestamp.

## Order position
The sequence in which an exercise entry was performed on a given day. This is a daily integer (1, 2, 3, …) rather than a textual label.

# Data Model

- `Exercise`
  - `name`
  - `group` (one of Upper Push, Upper Pull, Legs, Core)
  - `type` (one of Reps or Duration)

- `ExerciseEntry`
  - `exerciseName` or `exerciseId`
  - `date`
  - `orderPosition`
  - `sets`: array of `Set`

- `Set`
  - `reps` (optional)
  - `timeSeconds` (optional)
  - `weightLbs` (optional)

Constraints:
- Each exercise belongs to exactly one exercise group.
- Each set is either reps-based or time-based, not both.
- `weightLbs` is optional.
- `orderPosition` is calculated from the entry sequence for that date.

# Automatic Behavior

- The app should maintain a predefined mapping of exercises to exercise groups.
- When a new exercise is added, the user should be able to select its group.
- When an exercise entry is added for a date, the app should assign `orderPosition` automatically based on the current count of entries for that day.
- The form should automatically adapt to the exercise type by showing the relevant inputs for reps, time, and weight.
- The user should be able to edit the assigned group later if an exercise is added incorrectly.

# User Flows

- The user can select an existing exercise from a dropdown.
- The user can create a new exercise and assign it to a group.
- The app generates a set entry form that adapts to the selected exercise.
- The user can add one or more sets for the exercise.
- The user can view previous performance for the selected exercise, including the last session and recent entries.
- The user can see total reps for each group on a given day.

# Analytics and Reporting

- The app should show daily totals for each exercise group.
- For a given day and group, the app should calculate the total number of reps across reps-based sets.
- Time-based sets should not be included in rep totals.
- The app may optionally show total weight lifted per group if weight data is available.
- The totals should be visible in the UI after entry is recorded.

# Examples

### Lat pull-down, wide-grip
- Group: Upper Pull
- Date: 2026-05-24
- Order position: 1
- Sets:
  1. 15 reps, 70 lbs
  2. 12 reps, 110 lbs
  3. 12 reps, 115 lbs

### Dip
- Group: Upper Push
- Date: 2026-05-24
- Order position: 2
- Sets:
  1. 12 reps, 0 lbs
  2. 12 reps, 0 lbs

### Plank
- Group: Core
- Date: 2026-05-23
- Order position: 1
- Sets:
  1. 60 s, 0 lbs

# Interface

## Main Layout

The app has six main sections:

1. **Exercise Selection** — dropdown to select or search for an existing exercise
2. **Entry Form** — date picker, set entry fields, and action buttons
3. **Past Performance** — history of recent entries for the selected exercise
4. **Current Session** - a list of every exercise, including each set, their weights, and reps/duration, done this day
5. **Daily Summary** — total reps and estimated total weight for each exercise group on the selected date
6. **History** - A link that opens a separate view with all workout sessions, including all logged sets from the current session

## Exercise Selection

- A dropdown menu labeled "Select exercise" displays all available exercises, grouped by their exercise group.
- Exercise options are formatted as "Group › Exercise Name" with an optional "[duration]" label for time-based exercises.
- Below the dropdown is a "New Exercise" button.
- The starting list of exercises can be found in the EXERCISES.md file

## New Exercise Form

Clicking "New Exercise" reveals a form with:

- Text input field labeled "Exercise" for the exercise name
- Dropdown labeled "Exercise Group" with options: Upper Push, Upper Pull, Legs, Core
- Checkbox labeled "duration" — if checked, the exercise will be saved as time-based; otherwise, reps-based
- "Save" button to create the exercise
- On save, the form hides, the new exercise appears in the dropdown, and a toast confirms "Exercise added."

## Entry Form

Once an exercise is selected, the form displays:

- **Date picker** (defaults to today) to select which day the entry is for
- **Set entry fields** that adapt based on exercise type:
  - **Reps-based exercises**: Fields for "Reps" and "Weight (lbs)"
  - **Duration-based exercises**: Fields for "Time (s)" and "Weight (lbs)"
  - Weight is optional, and should be set to 0 if no value is entered
- **Set number labels** — each set is labeled "Set 1", "Set 2", etc.
- **Remove set button** next to each set to delete that set
- **"Add set" button** to add another set to the entry (creates a new blank set)
- **"Save entry" button** to submit the entire entry to the database
- **"Clear" button** to reset the form

### Multiple Sets

- The entry form starts with a single 'set' form
- Users can add as many sets as needed by clicking "Add set".
- Each set can have different reps, weight, or duration values.
- A "Remove set" button appears for each set; clicking it deletes that set and re-renders the remaining sets.
- At least one set with valid data (reps, time, or weight) is required before saving.

### Entry Submission

Clicking "Save entry" triggers validation:

- An exercise must be selected
- A date must be selected
- At least one set must have a reps value (for reps-based exercises) or a time value (for duration-based exercises)
- A single set cannot have both reps and time values
- On successful save, a toast shows "Entry saved.", the form clears, and both the daily totals and history refresh.

## Past Performance

Below the entry form, a "history" section shows the last 2 entries for the selected exercise, displaying:

- Exercise name as a card title
- For each entry: the date and order position (e.g., "Date: 2026-05-24, position: 1")
- For each set in the entry: "Set N" label followed by a summary (e.g., "12 reps • 110 lbs")
- If weight is not provided, only reps or time is shown

If no exercise is selected, a placeholder shows "Select an exercise to see recent history."

## Daily Summary

At the bottom of the entry form, the daily summary displays:

- For each exercise group with entries on the selected date, a card showing:
  - The group name as a heading (e.g., "Upper Push")
  - "Total reps: N" — the sum of all reps across all reps-based sets for that group on that date
  - "Total duration: SS" - the sum of all duration times for duration-based sets for that group on that date. The format should stay in seconds even for values greater than 1 minute.
- If no entries exist for the selected date, a message shows "No entries recorded for today."

## History

There should be a button labelled 'Records'. When clicked, it should open a new screen that has a list of every workout date. When a date is clicked, it displays every exercise performed that day, along with orderPosition, weight, and reps/duration.

There should also be an 'export to json' button that saves the data


# Acceptance Criteria

- When a user adds a new exercise entry, the app saves the exercise name, group, date, order position, and all sets.
- When a user selects an exercise, the app displays the most recent past session for that exercise.
- When a user views a daily group summary, the app displays the total reps for that group on that day.
- The app supports both reps-based and time-based sets, and does not require both values for a single set.
