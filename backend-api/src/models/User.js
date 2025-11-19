import { getDatabase } from "@/lib/mongodb";
import crypto from "crypto";

export async function createUser(email, authSalt, authHash, encryptedEncryptionKey, encryptedVault) {
  const db = await getDatabase();
  const users = db.collection("users");

  const result = await users.insertOne({
    email,
    authSalt,
    authHash,
    encryptedEncryptionKey,
    encryptedVault,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return result.insertedId;
}

export async function getUserByEmail(email) {
  const db = await getDatabase();
  const users = db.collection("users");
  return users.findOne({ email });
}

export async function updateUserVault(email, encryptedVault) {
  const db = await getDatabase();
  const users = db.collection("users");

  const result = await users.updateOne(
    { email },
    {
      $set: {
        encryptedVault,
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}