"use client";

export interface TAProfile {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  phone: string | null;
  phone_consent: boolean;
  photo_url: string | null;
  where_from: string | null;
  moved_to_germany: string | null;
  likes_germany: string | null;
  vacation_spot: string | null;
  great_at: string | null;
  not_great_at: string | null;
  art_type: string | null;
  superpower: string | null;
  famous_last_words: string | null;
  dietary_restrictions: string | null;
  dietary_options: string[] | null;
  hometown_city: string | null;
  hometown_country: string | null;
}

function getInitials(first: string | null, last: string | null): string {
  const f = first?.charAt(0)?.toUpperCase() || "";
  const l = last?.charAt(0)?.toUpperCase() || "";
  return f + l || "?";
}

interface ProfileField {
  label: string;
  value: string | null | undefined;
}

export function TAProfileCard({
  profile,
  variant,
}: {
  profile: TAProfile;
  variant: "school" | "homestay";
}) {
  const displayName = profile.preferred_name || profile.first_name;

  const fields: ProfileField[] = [
    { label: "I am from:", value: profile.where_from },
    { label: "I moved to Germany in:", value: profile.moved_to_germany },
    { label: "The things I like about Germany are:", value: profile.likes_germany },
    { label: "What's your favorite place to vacation?", value: profile.vacation_spot },
    { label: "I am great at:", value: profile.great_at },
    { label: "I am NOT so great at:", value: profile.not_great_at },
    { label: "My favorite art to make is:", value: profile.art_type },
    { label: "If I could choose a superpower it would be:", value: profile.superpower },
    { label: "My famous last words are:", value: profile.famous_last_words },
  ];

  // Homestay-only fields
  const homestayFields: ProfileField[] = [];
  if (variant === "homestay") {
    if (profile.phone) {
      homestayFields.push({ label: "Phone:", value: profile.phone });
    }
    const dietParts: string[] = [];
    if (profile.dietary_restrictions) dietParts.push(profile.dietary_restrictions);
    if (profile.dietary_options && profile.dietary_options.length > 0) {
      dietParts.push(profile.dietary_options.join(", "));
    }
    if (dietParts.length > 0) {
      homestayFields.push({ label: "Dietary requirements:", value: dietParts.join(" — ") });
    }
    const hometown = [profile.hometown_city, profile.hometown_country].filter(Boolean).join(", ");
    if (hometown) {
      homestayFields.push({ label: "Hometown:", value: hometown });
    }
  }

  const allFields = [...fields, ...homestayFields].filter((f) => f.value);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
      <div className="flex flex-col md:flex-row">
        {/* Left column — gray background */}
        <div className="flex w-full flex-col items-center bg-zinc-100 px-6 py-8 dark:bg-zinc-800 md:w-64 md:shrink-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Teaching Artist Profile
          </p>
          <h3 className="mb-6 text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {displayName}
          </h3>
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt={displayName}
              className="h-40 w-40 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-zinc-300 text-3xl font-bold text-zinc-500 dark:bg-zinc-600 dark:text-zinc-300">
              {getInitials(profile.first_name, profile.last_name)}
            </div>
          )}
          <p className="mt-6 text-xs font-semibold tracking-wide text-zinc-400 dark:text-zinc-500">
            InterACT English
          </p>
        </div>

        {/* Right column — white background */}
        <div className="flex-1 bg-white px-6 py-8 dark:bg-zinc-900">
          {allFields.length === 0 ? (
            <p className="text-sm text-zinc-400">No profile information available.</p>
          ) : (
            <div className="space-y-4">
              {allFields.map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {field.label}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
