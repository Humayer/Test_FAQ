import { prisma } from "@/lib/db/prisma";
import { getDefaultSynonyms } from "@/lib/search/defaultSynonyms";
import type { ImportPreview } from "./buildPreview";

/**
 * Writes the valid + reviewed-but-accepted rows of an import preview into
 * FAQTopic / ContactPerson / FAQTopicContact. Rows marked "invalid" are
 * always skipped. Rows marked "review" are imported too (so the admin gets
 * to see and fix them afterwards in the normal admin UI), but any contact
 * whose email looked suspicious is stored with needsReview=true and is never
 * silently corrected.
 *
 * A person can appear on many rows (topics) in the same sheet. Contacts are
 * deduplicated by (name, department) regardless of whether a given row has
 * an email at all, and — critically — a row with a suspicious/mismatched
 * email is never allowed to overwrite an already-confirmed-good record for
 * that same person. Without this guard, a single malformed or misaligned
 * row elsewhere in the sheet could silently corrupt that person's email for
 * every other topic they're linked to, depending purely on row order.
 */
export async function applyImportPreview(preview: ImportPreview) {
  const rowsToImport = preview.rows.filter((r) => r.status !== "invalid");

  let topicsCreated = 0;
  let topicsUpdated = 0;
  let contactsCreated = 0;
  let contactsUpdated = 0;

  for (const row of rowsToImport) {
    const existingTopic = await prisma.fAQTopic.findUnique({ where: { purpose: row.purpose } });

    const topic = existingTopic
      ? await prisma.fAQTopic.update({
          where: { id: existingTopic.id },
          data: { department: row.department },
        })
      : await prisma.fAQTopic.create({
          data: {
            purpose: row.purpose,
            department: row.department,
            keywords: getDefaultSynonyms(row.purpose).join("\n"),
          },
        });

    if (existingTopic) topicsUpdated += 1;
    else topicsCreated += 1;

    // Clear previous topic<->contact links for this topic so a re-import
    // reflects the latest sheet exactly, then re-link fresh contacts below.
    await prisma.fAQTopicContact.deleteMany({ where: { faqTopicId: topic.id } });

    for (const contact of row.contacts) {
      if (!contact.name) continue;

      const email = contact.email?.trim() || null;

      // Match existing contact by (name + department) regardless of whether
      // this particular row has an email, so the same person is never
      // duplicated just because one of their rows happens to be missing an
      // email.
      const existingContact = await prisma.contactPerson.findFirst({
        where: { name: contact.name, department: row.department },
      });

      // If we already have a *confirmed-good* record for this person (a real
      // email, not flagged), never let a different, suspicious row overwrite
      // it — a single bad row elsewhere in the sheet must not corrupt a
      // contact's already-correct info. We still link the topic to them.
      const wouldCorruptGoodRecord =
        !!existingContact &&
        !!existingContact.email &&
        !existingContact.needsReview &&
        contact.emailIsSuspicious &&
        existingContact.email !== email;

      let contactRecord;
      if (!existingContact) {
        contactRecord = await prisma.contactPerson.create({
          data: {
            name: contact.name,
            email,
            department: row.department,
            needsReview: contact.emailIsSuspicious,
            reviewNote: contact.emailIsSuspicious ? contact.emailReason ?? "Flagged during import" : null,
          },
        });
        contactsCreated += 1;
      } else if (wouldCorruptGoodRecord) {
        // Leave the existing good record untouched; just reuse it.
        contactRecord = existingContact;
      } else {
        contactRecord = await prisma.contactPerson.update({
          where: { id: existingContact.id },
          data: {
            email,
            department: row.department,
            needsReview: contact.emailIsSuspicious,
            reviewNote: contact.emailIsSuspicious ? contact.emailReason ?? "Flagged during import" : null,
          },
        });
        contactsUpdated += 1;
      }

      await prisma.fAQTopicContact.create({
        data: { faqTopicId: topic.id, contactPersonId: contactRecord.id },
      });
    }
  }

  return { topicsCreated, topicsUpdated, contactsCreated, contactsUpdated, rowsImported: rowsToImport.length };
}
