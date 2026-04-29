import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const supabase = await createClient();

  // Get all TAs with their latest message
  const { data: tas } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, photo_url")
    .eq("role", "ta")
    .eq("is_active", true)
    .order("first_name", { ascending: true });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Messages
      </h2>

      {!tas || tas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500">No teaching artists to message yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tas.map((ta) => (
            <div
              key={ta.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex items-center gap-3">
                {ta.photo_url ? (
                  <img
                    src={ta.photo_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {(ta.first_name?.[0] || ta.email[0]).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {ta.first_name && ta.last_name
                      ? `${ta.first_name} ${ta.last_name}`
                      : ta.email}
                  </p>
                  <p className="text-xs text-zinc-500">{ta.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
