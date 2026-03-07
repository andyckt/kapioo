"use client";

type StoredUser = Record<string, any>;

function omitUndefined<T extends Record<string, any>>(value: T | undefined): Partial<T> {
  if (!value) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch (error) {
    console.error("Failed to parse stored user:", error);
    return null;
  }
}

export function setStoredUser(user: StoredUser): StoredUser {
  if (typeof window === "undefined") {
    return user;
  }

  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export function mergeStoredUser(nextUser: StoredUser): StoredUser {
  const currentUser = getStoredUser() || {};
  const nextAddress =
    nextUser.address === undefined
      ? currentUser.address
      : {
          ...(currentUser.address || {}),
          ...omitUndefined(nextUser.address),
        };

  const mergedUser = {
    ...currentUser,
    ...omitUndefined(nextUser),
    address: nextAddress,
  };

  return setStoredUser(mergedUser);
}
