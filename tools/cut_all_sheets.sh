#!/bin/sh
# Re-cut every animation sheet of the base character (run is the size reference), then rebuild all athletes.
set -e
cd "$(dirname "$0")/.."
S=assets/source; B=assets/characters/base
python3 tools/cut_sprite_sheet.py $S/base_run_sheet.jpg   $B/run   run
python3 tools/cut_sprite_sheet.py $S/base_start_sheet.jpg $B/start start $B/run
python3 tools/cut_sprite_sheet.py $S/base_dip_sheet.jpg   $B/dip   dip   $B/run
python3 tools/cut_sprite_sheet.py $S/base_trip_sheet.jpg  $B/trip  trip  $B/run
python3 tools/cut_sprite_sheet.py $S/base_hurdle_sheet.jpg $B/hurdle hurdle $B/run
# standing came out ~5% taller than the front-view standing frame of the celebration
python3 tools/cut_sprite_sheet.py $S/base_stand_sheet.jpg $B/stand stand $B/run --adjust=0.95
# celebration: frames 1 and 4 are front view (podium); measure on the side-view jump frames
python3 tools/cut_sprite_sheet.py $S/base_cheer_sheet.jpg $B/cheer cheer $B/run --keep-height --measure=2,3
python3 tools/cut_sprite_sheet.py $S/base_ljtakeoff_sheet.jpg $B/ljtakeoff ljtakeoff $B/run
python3 tools/cut_sprite_sheet.py $S/base_ljflight_sheet.jpg $B/ljflight ljflight $B/run
python3 tools/cut_sprite_sheet.py $S/base_ljstretch_sheet.jpg $B/ljstretch ljstretch $B/run
python3 tools/cut_sprite_sheet.py $S/base_ljland_sheet.jpg $B/ljland ljland $B/run
# javelin: the white javelin throws off the size measures; matched by eye to the standing pose
python3 tools/cut_sprite_sheet.py $S/base_javstand_sheet.jpg $B/javstand javstand $B/run --adjust=1.19
python3 tools/cut_sprite_sheet.py $S/base_javrun_sheet.jpg $B/javrun javrun $B/run --javelin --adjust=1.15
python3 tools/cut_sprite_sheet.py $S/base_javpull_sheet.jpg $B/javpull javpull $B/run --adjust=1.14 \
  "--javelins=2,271,358,98;103,403,658,138;410,418,955,132;725,462,1275,150"
python3 tools/cut_sprite_sheet.py $S/base_javthrow_sheet.jpg $B/javthrow javthrow $B/run \
  "--javelins=2,234,418,72;118,371,755,70;300,282,1215,40;"
python3 tools/cut_sprite_sheet.py $S/base_javafter_sheet.jpg $B/javafter javafter $B/run --measure=1,2
python3 tools/build_characters.py
