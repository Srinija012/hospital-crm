import 'fake-indexeddb/auto';
import { AegisDB } from '../src/lib/database';

async function seed() {
  console.log("Initializing AegisDB with fake-indexeddb in Node...");
  const db = new AegisDB();

  console.log("Generating 10,000 patients...");
  const total = 10000;
  const chunkSize = 1000;

  const startTime = Date.now();

  for (let i = 0; i < total; i += chunkSize) {
    const chunk: any[] = [];
    for (let j = 0; j < chunkSize; j++) {
      const idNum = i + j + 1;
      chunk.push({
        id: `pat-seed-${idNum}`,
        name: `Patient Seed ${idNum}`,
        age: 20 + (idNum % 60),
        gender: idNum % 2 === 0 ? "Male" : "Female",
        dob: "1990-01-01",
        phone: `+919900${String(idNum).padStart(6, '0')}`,
        alternatePhone: "",
        email: `patient.seed.${idNum}@example.com`,
        addressInfo: { address: "123 Seed St", city: "Hyderabad", state: "TS", country: "India", pincode: "500001" },
        bloodGroup: "O+",
        existingConditions: idNum % 5 === 0 ? "Diabetes" : "None",
        allergies: idNum % 7 === 0 ? "Penicillin" : "None",
        doctorAssignedId: "doc-1",
        doctorAssignedName: "Dr. Sarah Connor",
        preferredLanguage: "English",
        preferredContactMethod: "WhatsApp",
        whatsappOptIn: true,
        lastVisit: "2026-06-11",
        vitals: [],
        medicalHistory: [],
        prescriptions: [],
        communications: [],
        enableAutomatedFollowUp: false,
        archived: false,
        createdAt: new Date().toISOString()
      });
    }

    await db.patients.bulkAdd(chunk);
    console.log(`Seeded chunk ${i / chunkSize + 1} / ${total / chunkSize}`);
  }

  const duration = Date.now() - startTime;
  const count = await db.patients.count();
  console.log(`Seeding completed. Total patients in mock DB: ${count}`);
  console.log(`Time taken: ${(duration / 1000).toFixed(2)} seconds`);
  
  db.close();
}

seed().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
