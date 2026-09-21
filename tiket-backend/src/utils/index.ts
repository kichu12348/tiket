export const generateSlug = (len: number = 5): string => {
  const vals = "abcdefghijklmnopqrstuvwxyz123456789";
  let slug = "";
  for (let i = 0; i < len; i++) {
    const randomIndex = Math.floor(Math.random() * vals.length);
    slug += vals[randomIndex];
  }
  return slug;
};

export * from "./verifyOwner";
export * from "./emailService";

