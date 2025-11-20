import users from "./Schema.js";

export async function createUser(email, authSalt, authHash, encryptedEncryptionKey, encryptedVault) {
  
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
  return users.findOne({ email });
}

export async function updateUserVault(email, encryptedVault) {
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

