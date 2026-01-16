// Cleaning checklist templates for different service types
// Based on industry standards and Helper Bee's requirements

export interface ChecklistTask {
  id: string;
  task: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface ChecklistCategory {
  category: string;
  icon: string;
  tasks: ChecklistTask[];
}

export type ChecklistTemplate = ChecklistCategory[];

// ============================================
// STANDARD / ROUTINE CLEANING
// ============================================
export const STANDARD_CLEANING_TEMPLATE: ChecklistTemplate = [
  {
    category: 'Kitchen',
    icon: '🍳',
    tasks: [
      { id: 'k1', task: 'Wash & put away dishes (load/unload dishwasher)', completed: false },
      { id: 'k2', task: 'Wipe exterior of appliances (microwave, oven, fridge)', completed: false },
      { id: 'k3', task: 'Wipe counters & backsplash', completed: false },
      { id: 'k4', task: 'Clean outside of cabinets', completed: false },
      { id: 'k5', task: 'Scrub & dry sinks and fixtures', completed: false },
      { id: 'k6', task: 'Sweep & mop kitchen floor', completed: false },
      { id: 'k7', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'Bathrooms',
    icon: '🚿',
    tasks: [
      { id: 'b1', task: 'Clean toilets (inside & out, including base)', completed: false },
      { id: 'b2', task: 'Scrub sinks and fixtures', completed: false },
      { id: 'b3', task: 'Scrub showers and tubs', completed: false },
      { id: 'b4', task: 'Wipe counters and backsplash', completed: false },
      { id: 'b5', task: 'Clean outside of cabinets', completed: false },
      { id: 'b6', task: 'Clean mirrors & glass surfaces', completed: false },
      { id: 'b7', task: 'Sweep & mop bathroom floor', completed: false },
      { id: 'b8', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'Bedrooms & Living Areas',
    icon: '🛏️',
    tasks: [
      { id: 'br1', task: 'Dust & vacuum 2 rooms of choice (no ladder or moving furniture)', completed: false },
      { id: 'br2', task: 'Change sheets on 1 bed (remove dirty, replace with clean provided)', completed: false },
      { id: 'br3', task: 'Dust/wipe mantles, shelves, dressers', completed: false },
      { id: 'br4', task: 'Dust/wipe headboards and nightstands', completed: false },
      { id: 'br5', task: 'Dust/wipe electronics and flat surfaces', completed: false },
      { id: 'br6', task: 'Vacuum/sweep all finished floors', completed: false },
      { id: 'br7', task: 'Empty trash cans', completed: false },
    ],
  },
  {
    category: 'General Tasks',
    icon: '✅',
    tasks: [
      { id: 'g1', task: 'Empty all trash cans → take to outdoor bin', completed: false },
      { id: 'g2', task: 'Clear walkways of tripping hazards', completed: false },
      { id: 'g3', task: 'Clean out the dryer vent', completed: false },
      { id: 'g4', task: 'Do 1 load of laundry (wash, dry, fold, put away as directed)', completed: false },
      { id: 'g5', task: 'Spot clean walls (fingerprints, smudges)', completed: false },
      { id: 'g6', task: 'Wipe down light switches and door handles', completed: false },
    ],
  },
];

// ============================================
// DEEP CLEANING
// ============================================
export const DEEP_CLEANING_TEMPLATE: ChecklistTemplate = [
  {
    category: 'Kitchen',
    icon: '🍳',
    tasks: [
      { id: 'dk1', task: 'Clean inside of microwave (walls, turntable, ceiling)', completed: false },
      { id: 'dk2', task: 'Clean inside of oven (racks, walls, door)', completed: false },
      { id: 'dk3', task: 'Clean inside of refrigerator (shelves, drawers, walls)', completed: false },
      { id: 'dk4', task: 'Clean exterior of all appliances (dishwasher, stove, fridge)', completed: false },
      { id: 'dk5', task: 'Deep clean counters, backsplash, and grout', completed: false },
      { id: 'dk6', task: 'Clean inside AND outside of cabinets', completed: false },
      { id: 'dk7', task: 'Scrub & disinfect sink and fixtures', completed: false },
      { id: 'dk8', task: 'Clean under sink area', completed: false },
      { id: 'dk9', task: 'Degrease stovetop and range hood', completed: false },
      { id: 'dk10', task: 'Wipe down all cabinet fronts and handles', completed: false },
      { id: 'dk11', task: 'Clean baseboards', completed: false },
      { id: 'dk12', task: 'Sweep, mop, and detail floor edges', completed: false },
      { id: 'dk13', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'Bathrooms',
    icon: '🚿',
    tasks: [
      { id: 'db1', task: 'Deep clean toilets (including behind tank, base, bolts)', completed: false },
      { id: 'db2', task: 'Scrub tile and grout in shower/tub', completed: false },
      { id: 'db3', task: 'Clean shower doors and tracks', completed: false },
      { id: 'db4', task: 'Remove soap scum from all surfaces', completed: false },
      { id: 'db5', task: 'Deep clean sinks and fixtures', completed: false },
      { id: 'db6', task: 'Clean inside AND outside of cabinets/vanity', completed: false },
      { id: 'db7', task: 'Clean mirrors and glass surfaces (streak-free)', completed: false },
      { id: 'db8', task: 'Clean exhaust fan cover', completed: false },
      { id: 'db9', task: 'Wipe down all towel racks and hardware', completed: false },
      { id: 'db10', task: 'Clean baseboards', completed: false },
      { id: 'db11', task: 'Sweep, mop, and detail floor edges', completed: false },
      { id: 'db12', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'Bedrooms',
    icon: '🛏️',
    tasks: [
      { id: 'dbed1', task: 'Dust ceiling fans and light fixtures', completed: false },
      { id: 'dbed2', task: 'Clean windows and window sills', completed: false },
      { id: 'dbed3', task: 'Dust blinds/shutters', completed: false },
      { id: 'dbed4', task: 'Clean all furniture surfaces (dressers, nightstands, desks)', completed: false },
      { id: 'dbed5', task: 'Dust/wipe headboards and bed frames', completed: false },
      { id: 'dbed6', task: 'Clean closet shelving and organizers', completed: false },
      { id: 'dbed7', task: 'Wipe down doors, door frames, and handles', completed: false },
      { id: 'dbed8', task: 'Clean baseboards and molding', completed: false },
      { id: 'dbed9', task: 'Vacuum under beds (if accessible)', completed: false },
      { id: 'dbed10', task: 'Vacuum closets and corners', completed: false },
      { id: 'dbed11', task: 'Vacuum/mop all floors', completed: false },
      { id: 'dbed12', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'Living Areas',
    icon: '🛋️',
    tasks: [
      { id: 'dliv1', task: 'Dust ceiling fans and light fixtures', completed: false },
      { id: 'dliv2', task: 'Clean windows and window sills', completed: false },
      { id: 'dliv3', task: 'Dust blinds/shutters', completed: false },
      { id: 'dliv4', task: 'Deep dust all furniture and surfaces', completed: false },
      { id: 'dliv5', task: 'Clean TV screens and electronics', completed: false },
      { id: 'dliv6', task: 'Dust/wipe picture frames and decorations', completed: false },
      { id: 'dliv7', task: 'Wipe down doors, door frames, and handles', completed: false },
      { id: 'dliv8', task: 'Clean baseboards and molding', completed: false },
      { id: 'dliv9', task: 'Vacuum upholstered furniture (if requested)', completed: false },
      { id: 'dliv10', task: 'Vacuum corners and hard-to-reach areas', completed: false },
      { id: 'dliv11', task: 'Vacuum/mop all floors thoroughly', completed: false },
      { id: 'dliv12', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'Additional Deep Cleaning',
    icon: '✨',
    tasks: [
      { id: 'dad1', task: 'Wipe down all light switches and outlet covers', completed: false },
      { id: 'dad2', task: 'Clean all interior doors (both sides)', completed: false },
      { id: 'dad3', task: 'Detail clean all door handles and hardware', completed: false },
      { id: 'dad4', task: 'Clean laundry room (washer exterior, dryer exterior, lint trap)', completed: false },
      { id: 'dad5', task: 'Vacuum/dust air vents and returns', completed: false },
      { id: 'dad6', task: 'Wipe down handrails and banisters', completed: false },
      { id: 'dad7', task: 'Empty all trash cans → take to outdoor bin', completed: false },
    ],
  },
];

// ============================================
// MOVE IN / MOVE OUT CLEANING
// ============================================
export const MOVE_OUT_CLEANING_TEMPLATE: ChecklistTemplate = [
  {
    category: 'Kitchen',
    icon: '🍳',
    tasks: [
      { id: 'mk1', task: 'Deep clean inside microwave (walls, ceiling, turntable, vents)', completed: false },
      { id: 'mk2', task: 'Deep clean inside oven (racks, walls, door, heating elements)', completed: false },
      { id: 'mk3', task: 'Deep clean inside refrigerator & freezer (all shelves, drawers, walls)', completed: false },
      { id: 'mk4', task: 'Clean behind/under refrigerator (if accessible)', completed: false },
      { id: 'mk5', task: 'Clean inside dishwasher (filter, spray arms, seals)', completed: false },
      { id: 'mk6', task: 'Deep clean all appliance exteriors', completed: false },
      { id: 'mk7', task: 'Scrub counters, backsplash, and grout lines', completed: false },
      { id: 'mk8', task: 'Clean inside ALL cabinets and drawers (empty)', completed: false },
      { id: 'mk9', task: 'Clean outside of all cabinets, handles, and edges', completed: false },
      { id: 'mk10', task: 'Deep clean sink, faucet, and garbage disposal', completed: false },
      { id: 'mk11', task: 'Clean under sink and all cabinet interiors', completed: false },
      { id: 'mk12', task: 'Degrease stovetop, burners, drip pans, and range hood', completed: false },
      { id: 'mk13', task: 'Clean inside range hood and change/clean filter', completed: false },
      { id: 'mk14', task: 'Clean windows, window sills, and tracks', completed: false },
      { id: 'mk15', task: 'Dust/wipe light fixtures and ceiling fan', completed: false },
      { id: 'mk16', task: 'Wipe down all walls and remove marks/scuffs', completed: false },
      { id: 'mk17', task: 'Clean baseboards and molding', completed: false },
      { id: 'mk18', task: 'Sweep, mop, and detail all floor edges and corners', completed: false },
      { id: 'mk19', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'Bathrooms',
    icon: '🚿',
    tasks: [
      { id: 'mb1', task: 'Deep scrub toilet (inside, outside, behind tank, base, bolts)', completed: false },
      { id: 'mb2', task: 'Deep clean shower/tub (tile, grout, fixtures, drain)', completed: false },
      { id: 'mb3', task: 'Remove all soap scum and hard water stains', completed: false },
      { id: 'mb4', task: 'Clean shower doors, tracks, and seals', completed: false },
      { id: 'mb5', task: 'Clean shower head and remove mineral deposits', completed: false },
      { id: 'mb6', task: 'Deep clean sink, faucet, and drain', completed: false },
      { id: 'mb7', task: 'Clean inside ALL cabinets and drawers (empty)', completed: false },
      { id: 'mb8', task: 'Clean outside of cabinets/vanity and hardware', completed: false },
      { id: 'mb9', task: 'Clean mirrors (streak-free)', completed: false },
      { id: 'mb10', task: 'Clean medicine cabinet inside and out', completed: false },
      { id: 'mb11', task: 'Deep clean exhaust fan and cover', completed: false },
      { id: 'mb12', task: 'Clean all towel racks, toilet paper holders, hardware', completed: false },
      { id: 'mb13', task: 'Wipe down all walls and remove marks/scuffs', completed: false },
      { id: 'mb14', task: 'Clean windows, window sills, and tracks', completed: false },
      { id: 'mb15', task: 'Dust/wipe light fixtures', completed: false },
      { id: 'mb16', task: 'Clean baseboards and molding', completed: false },
      { id: 'mb17', task: 'Sweep, mop, and detail all floor edges and corners', completed: false },
      { id: 'mb18', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'All Bedrooms',
    icon: '🛏️',
    tasks: [
      { id: 'mbed1', task: 'Dust and clean ceiling fans (blades, motor housing)', completed: false },
      { id: 'mbed2', task: 'Clean all light fixtures and replace bulbs if needed', completed: false },
      { id: 'mbed3', task: 'Clean windows inside and out (if accessible)', completed: false },
      { id: 'mbed4', task: 'Clean window sills, tracks, and frames', completed: false },
      { id: 'mbed5', task: 'Deep clean blinds/shutters (each slat)', completed: false },
      { id: 'mbed6', task: 'Clean inside ALL closets (shelving, rods, floors)', completed: false },
      { id: 'mbed7', task: 'Wipe down all closet doors (inside and out)', completed: false },
      { id: 'mbed8', task: 'Clean all doors, door frames, and handles', completed: false },
      { id: 'mbed9', task: 'Wipe down all walls and remove marks/scuffs', completed: false },
      { id: 'mbed10', task: 'Clean baseboards and molding', completed: false },
      { id: 'mbed11', task: 'Clean air vents and returns', completed: false },
      { id: 'mbed12', task: 'Vacuum corners, edges, and under everything', completed: false },
      { id: 'mbed13', task: 'Vacuum/mop all floors thoroughly', completed: false },
      { id: 'mbed14', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'Living Areas & Common Spaces',
    icon: '🛋️',
    tasks: [
      { id: 'mliv1', task: 'Dust and clean ceiling fans (blades, motor housing)', completed: false },
      { id: 'mliv2', task: 'Clean all light fixtures', completed: false },
      { id: 'mliv3', task: 'Clean windows inside and out (if accessible)', completed: false },
      { id: 'mliv4', task: 'Clean window sills, tracks, and frames', completed: false },
      { id: 'mliv5', task: 'Deep clean blinds/shutters (each slat)', completed: false },
      { id: 'mliv6', task: 'Wipe down fireplace mantle and surround', completed: false },
      { id: 'mliv7', task: 'Clean inside fireplace (if applicable)', completed: false },
      { id: 'mliv8', task: 'Clean all doors, door frames, and handles', completed: false },
      { id: 'mliv9', task: 'Wipe down all walls and remove marks/scuffs', completed: false },
      { id: 'mliv10', task: 'Clean baseboards and molding', completed: false },
      { id: 'mliv11', task: 'Clean air vents and returns', completed: false },
      { id: 'mliv12', task: 'Clean stairway (handrails, spindles, steps)', completed: false },
      { id: 'mliv13', task: 'Vacuum corners, edges, and under everything', completed: false },
      { id: 'mliv14', task: 'Vacuum/mop all floors thoroughly', completed: false },
      { id: 'mliv15', task: 'Empty trash and replace bag', completed: false },
    ],
  },
  {
    category: 'Laundry Room & Utility',
    icon: '🧺',
    tasks: [
      { id: 'mlaun1', task: 'Clean inside and outside of washer (drum, seals, dispenser)', completed: false },
      { id: 'mlaun2', task: 'Clean inside and outside of dryer', completed: false },
      { id: 'mlaun3', task: 'Clean dryer vent and lint trap', completed: false },
      { id: 'mlaun4', task: 'Clean behind/under washer and dryer (if accessible)', completed: false },
      { id: 'mlaun5', task: 'Clean utility sink and faucet', completed: false },
      { id: 'mlaun6', task: 'Wipe down washer/dryer hookups and hoses', completed: false },
      { id: 'mlaun7', task: 'Clean baseboards and walls', completed: false },
      { id: 'mlaun8', task: 'Sweep and mop floor', completed: false },
    ],
  },
  {
    category: 'Final Touches',
    icon: '✨',
    tasks: [
      { id: 'mfin1', task: 'Clean all light switches and outlet covers throughout house', completed: false },
      { id: 'mfin2', task: 'Wipe down all door handles and hardware', completed: false },
      { id: 'mfin3', task: 'Clean entry door (inside and outside)', completed: false },
      { id: 'mfin4', task: 'Sweep/vacuum garage (if included)', completed: false },
      { id: 'mfin5', task: 'Clean garage door tracks and hardware (if included)', completed: false },
      { id: 'mfin6', task: 'Wipe down garage walls and shelving (if included)', completed: false },
      { id: 'mfin7', task: 'Clean patio/balcony sliding door tracks', completed: false },
      { id: 'mfin8', task: 'Sweep patio/balcony (if included)', completed: false },
      { id: 'mfin9', task: 'Remove all trash from property → take to outdoor bin', completed: false },
      { id: 'mfin10', task: 'Final walkthrough - check all areas', completed: false },
    ],
  },
];

/**
 * Get checklist template based on service type
 */
export function getChecklistTemplate(serviceType: 'STANDARD' | 'DEEP' | 'MOVE_OUT'): ChecklistTemplate {
  switch (serviceType) {
    case 'STANDARD':
      return JSON.parse(JSON.stringify(STANDARD_CLEANING_TEMPLATE)); // Deep clone
    case 'DEEP':
      return JSON.parse(JSON.stringify(DEEP_CLEANING_TEMPLATE)); // Deep clone
    case 'MOVE_OUT':
      return JSON.parse(JSON.stringify(MOVE_OUT_CLEANING_TEMPLATE)); // Deep clone
    default:
      return JSON.parse(JSON.stringify(STANDARD_CLEANING_TEMPLATE)); // Default to standard
  }
}

/**
 * Calculate checklist statistics
 */
export function calculateChecklistStats(checklistData: ChecklistTemplate) {
  let totalTasks = 0;
  let completedTasks = 0;

  checklistData.forEach((category) => {
    category.tasks.forEach((task) => {
      totalTasks++;
      if (task.completed) {
        completedTasks++;
      }
    });
  });

  return {
    totalTasks,
    completedTasks,
    percentComplete: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };
}
