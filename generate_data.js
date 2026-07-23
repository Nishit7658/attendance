const fs = require('fs');

const faculties = [
  // CE-1
  { code: 'NRS', name: 'Dr. Neha Soni' },
  { code: 'JBS', name: 'Prof. Jayna Shah' },
  { code: 'HVC', name: 'Prof. Hetal Chauhan' },
  { code: 'DJP', name: 'Prof. Divya parmar' },
  { code: 'MPP', name: 'Dr. Minal patel' },
  { code: 'PJD', name: 'Prof. Prexa Desai' },
  { code: 'MHS', name: 'Prof. Milind shah' },
  { code: 'PAP', name: 'Prof. Priyanka patel' },
  // CE-2
  { code: 'SMP', name: 'Dr. shrina patel' },
  { code: 'JP', name: 'Prof. Jeenal Patel' },
  { code: 'MCJ', name: 'Prof. Mital Joshi' },
  { code: 'NSV', name: 'Prof. Nisha Velani' },
  { code: 'PVB', name: 'Prof. Parul Bakaraniya' },
  { code: 'RBP', name: 'Prof. Rashmin Prajapati' },
  // CE-3
  { code: 'NBS', name: 'Prof. Nidhi Shah' },
  { code: 'BMJ', name: 'Dr. Barkha Joshi' },
  { code: 'KNU', name: 'Prof. Keyur Upadhyay' },
  { code: 'SDB', name: 'Prof. Swati Bopaliya' },
  { code: 'KSS', name: 'Prof. Keyur Suthar' },
  // CE-4
  { code: 'BYP', name: 'Dr. Brijesh Panchal' },
  { code: 'HJB', name: 'Prof. Himani Bhatt' },
  { code: 'AMP', name: 'Prof. Abhishek Patel' },
  // General Library
  { code: 'LIB', name: 'Library Staff' }
];

const uniqueFaculties = [];
const seenCodes = new Set();
for (const f of faculties) {
  if (!seenCodes.has(f.code)) {
    uniqueFaculties.push({ ...f, email: `${f.code.toLowerCase()}@faculty.college.edu` });
    seenCodes.add(f.code);
  }
}

const courses = [
  { code: 'SS', name: 'System Software' },
  { code: 'PDS', name: 'Python for Data Science' },
  { code: 'DM', name: 'Data Mining technique' },
  { code: 'MI', name: 'Microprocessor and Interfacing' },
  { code: 'CN', name: 'Computer Networks' },
  { code: 'PM', name: 'Project Management' },
  { code: 'WAD', name: 'Web Application And Development' },
  { code: 'LIB', name: 'Library Session' }
];

const entries = [];

function addEntry(div, dayOfWeek, start, end, courseCode, facultyCode, section, room) {
  entries.push({ division: div, dayOfWeek, startTime: start, endTime: end, courseCode, facultyCode, section, room });
}

function addLab(div, dayOfWeek, start, end, data) {
  for (const d of data) {
    if (d) addEntry(div, dayOfWeek, start, end, d.course, d.faculty, d.batch, d.room);
  }
}

// TIMETABLE CE-1
const CE1 = "CE 1";
addLab(CE1, 1, "09:35", "11:30", [
  { course: "SS", batch: "A", room: "F1", faculty: "NRS" },
  { course: "PDS", batch: "B", room: "F2", faculty: "JBS" },
  { course: "DM", batch: "C", room: "F3", faculty: "HVC" }
]);
addLab(CE1, 1, "12:15", "14:15", [{ course: "DM", batch: "ALL", room: "TBD", faculty: "PAP" }]);
addEntry(CE1, 1, "14:30", "15:30", "MI", "PJD", "ALL", "TBD");
addEntry(CE1, 1, "15:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

addLab(CE1, 2, "09:35", "11:30", [
  { course: "PDS", batch: "A", room: "F4", faculty: "JBS" },
  { course: "SS", batch: "B", room: "S3", faculty: "NRS" },
  { course: "CN", batch: "C", room: "F2", faculty: "DJP" }
]);
addLab(CE1, 2, "12:15", "14:15", [
  { course: "DM", batch: "A", room: "F2", faculty: "PAP" },
  { course: "MI", batch: "B", room: "F1", faculty: "PJD" },
  { course: "SS", batch: "C", room: "S3", faculty: "NRS" }
]);
addEntry(CE1, 2, "14:30", "15:30", "CN", "MPP", "ALL", "TBD");
addEntry(CE1, 2, "15:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

addEntry(CE1, 3, "09:35", "10:30", "SS", "NRS", "ALL", "TBD");
addEntry(CE1, 3, "10:30", "11:30", "PM", "MHS", "ALL", "TBD");
addLab(CE1, 3, "12:15", "14:15", [{ course: "PDS", batch: "ALL", room: "TBD", faculty: "JBS" }]);
addLab(CE1, 3, "14:30", "16:25", [
  { course: "MI", batch: "A", room: "F6", faculty: "PJD" },
  { course: "CN", batch: "B", room: "F4", faculty: "MPP" },
  { course: "DM", batch: "C", room: "S3", faculty: "JP" }
]);

addEntry(CE1, 4, "09:35", "10:30", "PM", "MHS", "ALL", "TBD");
addEntry(CE1, 4, "10:30", "11:30", "CN", "MPP", "ALL", "TBD");
addEntry(CE1, 4, "12:15", "13:15", "MI", "PJD", "ALL", "TBD");
addEntry(CE1, 4, "13:15", "14:15", "DM", "PAP", "ALL", "TBD");
addEntry(CE1, 4, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

addEntry(CE1, 5, "09:35", "10:30", "SS", "NRS", "ALL", "TBD");
addEntry(CE1, 5, "10:30", "11:30", "PDS", "JBS", "ALL", "TBD");
addLab(CE1, 5, "12:15", "14:15", [
  { course: "CN", batch: "A", room: "F1", faculty: "MPP" },
  { course: "DM", batch: "B", room: "G3/S6", faculty: "JP" },
  { course: "MI", batch: "C", room: "F4", faculty: "PJD" }
]);
addEntry(CE1, 5, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

addEntry(CE1, 6, "09:35", "10:30", "MI", "PJD", "ALL", "TBD");
addEntry(CE1, 6, "10:30", "11:30", "SS", "NRS", "ALL", "TBD");
addLab(CE1, 6, "12:15", "14:15", [{ course: "PDS", batch: "ALL", room: "TBD", faculty: "JBS" }]);
addEntry(CE1, 6, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");


// TIMETABLE CE-2
const CE2 = "CE 2";
addEntry(CE2, 1, "09:35", "10:30", "SS", "MHS", "ALL", "TBD");
addEntry(CE2, 1, "10:30", "11:30", "DM", "SMP", "ALL", "TBD");
addEntry(CE2, 1, "12:15", "13:15", "PM", "JP", "ALL", "TBD");
addEntry(CE2, 1, "13:15", "14:15", "LIB", "LIB", "ALL", "Central Library");
addLab(CE2, 1, "14:30", "16:25", [
  { course: "SS", batch: "A", room: "F1", faculty: "MHS" },
  { course: "CN", batch: "B", room: "F2", faculty: "MCJ" },
  { course: "MI", batch: "C", room: "F6", faculty: "PVB" }
]);

addEntry(CE2, 2, "09:35", "10:30", "MI", "PVB", "ALL", "TBD");
addEntry(CE2, 2, "10:30", "11:30", "CN", "MCJ", "ALL", "TBD");
addEntry(CE2, 2, "12:15", "13:15", "DM", "SMP", "ALL", "TBD");
addEntry(CE2, 2, "13:15", "14:15", "SS", "MHS", "ALL", "TBD");
addEntry(CE2, 2, "14:30", "15:30", "PDS", "RBP", "ALL", "TBD");

addLab(CE2, 3, "09:35", "11:30", [
  { course: "MI", batch: "A", room: "S2", faculty: "NSV" },
  { course: "DM", batch: "B", room: "F2", faculty: "SMP" },
  { course: "PDS", batch: "C", room: "F4", faculty: "HVC" }
]);
addEntry(CE2, 3, "12:15", "13:15", "PM", "JP", "ALL", "TBD");
addEntry(CE2, 3, "13:15", "14:15", "LIB", "LIB", "ALL", "Central Library");
addEntry(CE2, 3, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

addEntry(CE2, 4, "09:35", "10:30", "CN", "MCJ", "ALL", "TBD");
addEntry(CE2, 4, "10:30", "11:30", "MI", "PVB", "ALL", "TBD");
addEntry(CE2, 4, "12:15", "13:15", "PDS", "RBP", "ALL", "TBD");
addEntry(CE2, 4, "13:15", "14:15", "PM", "JP", "ALL", "TBD");
addLab(CE2, 4, "14:30", "16:25", [
  { course: "DM", batch: "A", room: "F1", faculty: "SMP" },
  { course: "PDS", batch: "B", room: "S3", faculty: "HVC" },
  { course: "DM", batch: "C", room: "S2", faculty: "BMJ" }
]);

addEntry(CE2, 5, "09:35", "10:30", "CN", "MCJ", "ALL", "TBD");
addEntry(CE2, 5, "10:30", "11:30", "MI", "PVB", "ALL", "TBD");
addEntry(CE2, 5, "12:15", "13:15", "SS", "MHS", "ALL", "TBD");
addEntry(CE2, 5, "13:15", "14:15", "DM", "SMP", "ALL", "TBD");
addLab(CE2, 5, "14:30", "16:25", [
  { course: "PDS", batch: "A", room: "F3", faculty: "RBP" },
  { course: "SS", batch: "B", room: "F4", faculty: "MHS" },
  { course: "CN", batch: "C", room: "F1", faculty: "MCJ" }
]);

addLab(CE2, 6, "09:35", "11:30", [
  { course: "CN", batch: "A", room: "F1", faculty: "MCJ" },
  { course: "MI", batch: "B", room: "G3/S6", faculty: "PVB" },
  { course: "SS", batch: "C", room: "F2", faculty: "MHS" }
]);
addEntry(CE2, 6, "12:15", "13:15", "PDS", "RBP", "ALL", "TBD");
addEntry(CE2, 6, "13:15", "14:15", "LIB", "LIB", "ALL", "Central Library");
addEntry(CE2, 6, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");


// TIMETABLE CE-3
const CE3 = "CE 3";
addEntry(CE3, 1, "09:35", "10:30", "PDS", "KSS", "ALL", "TBD");
addEntry(CE3, 1, "10:30", "11:30", "WAD", "NBS", "ALL", "TBD");
addEntry(CE3, 1, "12:15", "13:15", "PM", "PJD", "ALL", "TBD");
addEntry(CE3, 1, "13:15", "14:15", "MI", "KNU", "ALL", "TBD");
addEntry(CE3, 1, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

addLab(CE3, 2, "09:35", "11:30", [
  { course: "DM", batch: "A", room: "S2", faculty: "BMJ" },
  { course: "CN", batch: "B", room: "F1", faculty: "SDB" },
  { course: "WAD", batch: "C", room: "F5", faculty: "NBS" }
]);
addEntry(CE3, 2, "12:15", "13:15", "PDS", "KSS", "ALL", "TBD");
addEntry(CE3, 2, "13:15", "14:15", "MI", "KNU", "ALL", "TBD");
addEntry(CE3, 2, "14:30", "15:30", "CN", "SDB", "ALL", "TBD");

addEntry(CE3, 3, "09:35", "10:30", "PDS", "KSS", "ALL", "TBD");
addEntry(CE3, 3, "10:30", "11:30", "CN", "SDB", "ALL", "TBD");
addLab(CE3, 3, "12:15", "14:15", [
  { course: "MI", batch: "A", room: "F5", faculty: "KNU" },
  { course: "DM", batch: "B", room: "S4", faculty: "BMJ" },
  { course: "SS", batch: "C", room: "S3", faculty: "HVC" }
]);
addLab(CE3, 3, "14:30", "16:25", [
  { course: "CN", batch: "A", room: "F1", faculty: "SDB" },
  { course: "PDS", batch: "B", room: "F5", faculty: "KSS" },
  { course: "MI", batch: "C", room: "F3", faculty: "NSV" }
]);

addEntry(CE3, 4, "09:35", "10:30", "MI", "KNU", "ALL", "TBD");
addEntry(CE3, 4, "10:30", "11:30", "WAD", "NBS", "ALL", "TBD");
addEntry(CE3, 4, "12:15", "13:15", "SS", "HVC", "ALL", "TBD");
addEntry(CE3, 4, "13:15", "14:15", "PM", "PJD", "ALL", "TBD");
addEntry(CE3, 4, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

addEntry(CE3, 5, "09:35", "10:30", "WAD", "NBS", "ALL", "TBD");
addEntry(CE3, 5, "10:30", "11:30", "SS", "HVC", "ALL", "TBD");
addLab(CE3, 5, "12:15", "14:15", [
  { course: "SS", batch: "A", room: "F2", faculty: "HVC" },
  { course: "MI", batch: "B", room: "S4", faculty: "KNU" },
  { course: "PDS", batch: "C", room: "F5", faculty: "KSS" }
]);
addLab(CE3, 5, "14:30", "16:25", [
  { course: "PDS", batch: "A", room: "S4", faculty: "KSS" },
  { course: "SS", batch: "B", room: "S3", faculty: "HVC" },
  { course: "CN", batch: "C", room: "F6", faculty: "SDB" }
]);

addEntry(CE3, 6, "09:35", "10:30", "SS", "HVC", "ALL", "TBD");
addEntry(CE3, 6, "10:30", "11:30", "CN", "SDB", "ALL", "TBD");
addEntry(CE3, 6, "12:15", "13:15", "PM", "PJD", "ALL", "TBD");
addEntry(CE3, 6, "13:15", "14:15", "LIB", "LIB", "ALL", "Central Library");
addEntry(CE3, 6, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");


// TIMETABLE CE-4
const CE4 = "CE 4";
addEntry(CE4, 1, "09:35", "10:30", "PM", "BYP", "ALL", "TBD");
addEntry(CE4, 1, "10:30", "11:30", "WAD", "NBS", "ALL", "TBD");
addEntry(CE4, 1, "12:15", "13:15", "CN", "DJP", "ALL", "TBD");
addEntry(CE4, 1, "13:15", "14:15", "MI", "NSV", "ALL", "TBD");
addEntry(CE4, 1, "14:30", "15:30", "SS", "HJB", "ALL", "TBD");
addEntry(CE4, 1, "15:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

addEntry(CE4, 2, "09:35", "10:30", "MI", "NSV", "ALL", "TBD");
addEntry(CE4, 2, "10:30", "11:30", "SS", "HJB", "ALL", "TBD");
addLab(CE4, 2, "12:15", "14:15", [
  { course: "CN", batch: "A", room: "F4", faculty: "DJP" },
  { course: "WAD", batch: "B", room: "F5", faculty: "NBS" },
  { course: "PDS", batch: "C", room: "F3", faculty: "AMP" }
]);
addLab(CE4, 2, "14:30", "16:25", [
  { course: "SS", batch: "A", room: "F6", faculty: "MHS" },
  { course: "SS", batch: "B", room: "S4", faculty: "HJB" },
  { course: "MI", batch: "C", room: "F1", faculty: "KNU" }
]);

addEntry(CE4, 3, "09:35", "10:30", "PDS", "AMP", "ALL", "TBD");
addEntry(CE4, 3, "10:30", "11:30", "SS", "HJB", "ALL", "TBD");
addLab(CE4, 3, "12:15", "14:15", [
  { course: "PDS", batch: "A", room: "F4", faculty: "AMP" },
  { course: "CN", batch: "B", room: "F1", faculty: "DJP" },
  { course: "SS", batch: "C", room: "S2", faculty: "HJB" }
]);
addEntry(CE4, 3, "14:30", "15:30", "PM", "BYP", "ALL", "TBD");

addEntry(CE4, 4, "09:35", "10:30", "MI", "NSV", "ALL", "TBD");
addEntry(CE4, 4, "10:30", "11:30", "WAD", "NBS", "ALL", "TBD");
addEntry(CE4, 4, "12:15", "13:15", "CN", "DJP", "ALL", "TBD");
addEntry(CE4, 4, "13:15", "14:15", "LIB", "LIB", "ALL", "Central Library");
addEntry(CE4, 4, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

addEntry(CE4, 5, "09:35", "10:30", "WAD", "NBS", "ALL", "TBD");
addEntry(CE4, 5, "10:30", "11:30", "PDS", "AMP", "ALL", "TBD");
addEntry(CE4, 5, "12:15", "13:15", "CN", "DJP", "ALL", "TBD");
addEntry(CE4, 5, "13:15", "14:15", "LIB", "LIB", "ALL", "Central Library");
addLab(CE4, 5, "14:30", "16:25", [
  { course: "WAD", batch: "A", room: "S2", faculty: "NBS" },
  { course: "PDS", batch: "B", room: "F5", faculty: "AMP" },
  { course: "CN", batch: "C", room: "F2", faculty: "DJP" }
]);

addEntry(CE4, 6, "09:35", "10:30", "PM", "BYP", "ALL", "TBD");
addEntry(CE4, 6, "10:30", "11:30", "PDS", "AMP", "ALL", "TBD");
addLab(CE4, 6, "12:15", "14:15", [
  { course: "MI", batch: "A", room: "S4", faculty: "PVB" },
  { course: "MI", batch: "B", room: "F6", faculty: "NSV" },
  { course: "WAD", batch: "C", room: "F5", faculty: "NBS" }
]);
addEntry(CE4, 6, "14:30", "16:25", "LIB", "LIB", "ALL", "Central Library");

fs.writeFileSync('prisma/real_data.json', JSON.stringify({ faculties: uniqueFaculties, courses, entries }, null, 2));
console.log("Successfully regenerated prisma/real_data.json with Library sessions!");
