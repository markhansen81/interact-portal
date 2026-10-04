/**
 * Generates HTML profile documents for Teaching Artists.
 * Called when a TA signs a work order and gets linked to a project.
 */

interface ProfileData {
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  art_type?: string | null;
  art_profession?: string | null;
  education_level?: string | null;
  certifications?: string | null;
  tefl_status?: string | null;
  german_level?: string | null;
  german_professional?: boolean | null;
  exp_grades_1_4?: boolean | null;
  exp_grades_5_7?: boolean | null;
  exp_grades_8_plus?: boolean | null;
  exp_disabilities?: boolean | null;
  exp_disability_description?: string | null;
  great_at?: string | null;
  not_great_at?: string | null;
  superpower?: string | null;
  comic_title?: string | null;
  favourite_food?: string | null;
  dietary_restrictions?: string | null;
  dietary_options?: string[] | null;
  homestay_willing?: boolean | null;
  where_from?: string | null;
  hometown_city?: string | null;
  hometown_country?: string | null;
}

const PROFILE_FIELDS = `
  first_name, last_name, preferred_name, phone, photo_url, bio,
  art_type, art_profession, education_level, certifications, tefl_status,
  german_level, german_professional,
  exp_grades_1_4, exp_grades_5_7, exp_grades_8_plus,
  exp_disabilities, exp_disability_description,
  great_at, not_great_at, superpower, comic_title, favourite_food,
  dietary_restrictions, dietary_options,
  homestay_willing, where_from, hometown_city, hometown_country
`.replace(/\s+/g, " ").trim();

export { PROFILE_FIELDS };

function displayName(p: ProfileData): string {
  const first = p.preferred_name || p.first_name || "";
  const last = p.last_name || "";
  return `${first} ${last}`.trim() || "Unknown";
}

function escape(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function section(title: string, content: string): string {
  if (!content.trim()) return "";
  return `<h3 style="margin:18px 0 6px;color:#2d3748;font-size:15px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">${title}</h3>\n${content}`;
}

function field(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<p style="margin:4px 0;color:#4a5568;"><strong>${label}:</strong> ${escape(value)}</p>`;
}

function gradeExperience(p: ProfileData): string {
  const grades: string[] = [];
  if (p.exp_grades_1_4) grades.push("Grades 1\u20134");
  if (p.exp_grades_5_7) grades.push("Grades 5\u20137");
  if (p.exp_grades_8_plus) grades.push("Grades 8+");
  return grades.length ? grades.join(", ") : "";
}

function buildCommonHtml(p: ProfileData, heading: string): string {
  const name = displayName(p);

  const photoHtml = p.photo_url
    ? `<div style="margin-bottom:16px;"><img src="${escape(p.photo_url)}" alt="${escape(name)}" style="max-width:180px;border-radius:8px;border:2px solid #e2e8f0;" /></div>`
    : "";

  const bioSection = section("About Me", field("", p.bio).replace("<strong>:</strong> ", ""));

  const grades = gradeExperience(p);
  const experienceContent = [
    grades ? field("Grade Experience", grades) : "",
    p.exp_disabilities ? field("Experience with Disabilities", p.exp_disability_description || "Yes") : "",
  ].join("");
  const experienceSection = section("Teaching Experience", experienceContent);

  const artContent = [
    field("Art Type", p.art_type),
    field("Speciality / Profession", p.art_profession),
  ].join("");
  const artSection = section("Art &amp; Speciality", artContent);

  const langContent = [
    field("German Level", p.german_level),
    p.german_professional ? field("Professional German", "Yes") : "",
  ].join("");
  const langSection = section("Languages", langContent);

  const certContent = [
    field("Certifications", p.certifications),
    field("TEFL Status", p.tefl_status),
    field("Education", p.education_level),
  ].join("");
  const certSection = section("Certifications &amp; Education", certContent);

  const originContent = [
    field("From", p.where_from),
    p.hometown_city || p.hometown_country
      ? field("Hometown", [p.hometown_city, p.hometown_country].filter(Boolean).join(", "))
      : "",
  ].join("");
  const originSection = section("Background", originContent);

  const funContent = [
    field("Great At", p.great_at),
    field("Superpower", p.superpower),
    field("Favourite Food", p.favourite_food),
    field("Comic Book Title", p.comic_title),
  ].join("");
  const funSection = section("Fun Facts", funContent);

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;padding:20px;color:#2d3748;">
<h2 style="margin:0 0 16px;color:#1a202c;font-size:20px;">${escape(heading)}</h2>
${photoHtml}
${bioSection}
${artSection}
${experienceSection}
${langSection}
${certSection}
${originSection}
${funSection}
</div>`;
}

/**
 * Generates a school-facing TA profile document.
 */
export function generateSchoolProfile(profile: ProfileData): { name: string; content: string } {
  const name = displayName(profile);
  const heading = `Teaching Artist Profile \u2014 ${name}`;
  const content = buildCommonHtml(profile, heading);

  return {
    name: `TA Profile \u2014 ${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
    content,
  };
}

/**
 * Generates a homestay-facing TA profile document with personal details.
 */
export function generateHomestayProfile(profile: ProfileData): { name: string; content: string } {
  const name = displayName(profile);
  const heading = `Homestay Profile \u2014 ${name}`;

  const baseHtml = buildCommonHtml(profile, heading);

  // Build additional homestay-specific sections
  const contactContent = field("Phone", profile.phone);
  const contactSection = section("Contact Information", contactContent);

  const dietaryItems: string[] = [];
  if (profile.dietary_restrictions) dietaryItems.push(profile.dietary_restrictions);
  if (profile.dietary_options && profile.dietary_options.length > 0) {
    dietaryItems.push(...profile.dietary_options);
  }
  const dietaryContent = dietaryItems.length
    ? field("Dietary Requirements", dietaryItems.join(", "))
    : "";
  const dietarySection = section("Dietary Information", dietaryContent);

  const homestayContent = [
    field("Willing to Homestay", profile.homestay_willing ? "Yes" : profile.homestay_willing === false ? "No" : null),
  ].join("");
  const homestaySection = section("Homestay", homestayContent);

  // Insert the extra sections before the closing div
  const extraSections = `${contactSection}\n${dietarySection}\n${homestaySection}`;
  const content = baseHtml.replace("</div>", `${extraSections}\n</div>`);

  return {
    name: `Homestay Profile \u2014 ${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
    content,
  };
}
