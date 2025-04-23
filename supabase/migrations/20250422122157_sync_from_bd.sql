create table "public"."budget_users" (
    "budget_id" uuid not null,
    "user_id" uuid not null default auth.uid(),
    "role" text not null,
    "created_at" timestamp with time zone default now(),
    "profile_id" uuid not null
);


alter table "public"."budget_users" enable row level security;

create table "public"."budgets" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."budgets" enable row level security;

create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "amount" numeric(10,2) not null,
    "timeframe" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "budget_id" uuid
);


alter table "public"."categories" enable row level security;

create table "public"."profiles" (
    "user_id" uuid not null,
    "email" text not null,
    "name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "timezone" text not null default 'UTC'::text,
    "id" uuid not null default gen_random_uuid()
);


alter table "public"."profiles" enable row level security;

create table "public"."transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "category_id" uuid,
    "amount" numeric(10,2) not null,
    "description" text not null,
    "date" date not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "assigned_date" date not null default CURRENT_DATE
);


alter table "public"."transactions" enable row level security;

CREATE UNIQUE INDEX budget_users_pkey ON public.budget_users USING btree (budget_id, profile_id);

CREATE UNIQUE INDEX budgets_pkey ON public.budgets USING btree (id);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE INDEX idx_budget_users_user_id ON public.budget_users USING btree (user_id);

CREATE INDEX idx_categories_budget_id ON public.categories USING btree (budget_id);

CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);

CREATE INDEX idx_transactions_budget_id ON public.transactions USING btree (category_id);

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);

CREATE UNIQUE INDEX profiles_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX profiles_id_key1 ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

alter table "public"."budget_users" add constraint "budget_users_pkey" PRIMARY KEY using index "budget_users_pkey";

alter table "public"."budgets" add constraint "budgets_pkey" PRIMARY KEY using index "budgets_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."budget_users" add constraint "budget_users_auth_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."budget_users" validate constraint "budget_users_auth_user_id_fkey";

alter table "public"."budget_users" add constraint "budget_users_budget_id_fkey" FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE not valid;

alter table "public"."budget_users" validate constraint "budget_users_budget_id_fkey";

alter table "public"."budget_users" add constraint "budget_users_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."budget_users" validate constraint "budget_users_profile_id_fkey";

alter table "public"."budget_users" add constraint "budget_users_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text]))) not valid;

alter table "public"."budget_users" validate constraint "budget_users_role_check";

alter table "public"."categories" add constraint "budgets_timeframe_check" CHECK ((timeframe = ANY (ARRAY['weekly'::text, 'monthly'::text, 'yearly'::text]))) not valid;

alter table "public"."categories" validate constraint "budgets_timeframe_check";

alter table "public"."categories" add constraint "categories_budget_id_fkey" FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE not valid;

alter table "public"."categories" validate constraint "categories_budget_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_key" UNIQUE using index "profiles_id_key";

alter table "public"."profiles" add constraint "profiles_id_key1" UNIQUE using index "profiles_id_key1";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."transactions" add constraint "transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL not valid;

alter table "public"."transactions" validate constraint "transactions_category_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_budget_creator_to_users()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$BEGIN
    INSERT INTO budget_users (budget_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'owner');
    RETURN NEW;
END;$function$
;

CREATE OR REPLACE FUNCTION public.create_profile_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, timezone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email
    ),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
  );
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."budget_users" to "anon";

grant insert on table "public"."budget_users" to "anon";

grant references on table "public"."budget_users" to "anon";

grant select on table "public"."budget_users" to "anon";

grant trigger on table "public"."budget_users" to "anon";

grant truncate on table "public"."budget_users" to "anon";

grant update on table "public"."budget_users" to "anon";

grant delete on table "public"."budget_users" to "authenticated";

grant insert on table "public"."budget_users" to "authenticated";

grant references on table "public"."budget_users" to "authenticated";

grant select on table "public"."budget_users" to "authenticated";

grant trigger on table "public"."budget_users" to "authenticated";

grant truncate on table "public"."budget_users" to "authenticated";

grant update on table "public"."budget_users" to "authenticated";

grant delete on table "public"."budget_users" to "service_role";

grant insert on table "public"."budget_users" to "service_role";

grant references on table "public"."budget_users" to "service_role";

grant select on table "public"."budget_users" to "service_role";

grant trigger on table "public"."budget_users" to "service_role";

grant truncate on table "public"."budget_users" to "service_role";

grant update on table "public"."budget_users" to "service_role";

grant delete on table "public"."budgets" to "anon";

grant insert on table "public"."budgets" to "anon";

grant references on table "public"."budgets" to "anon";

grant select on table "public"."budgets" to "anon";

grant trigger on table "public"."budgets" to "anon";

grant truncate on table "public"."budgets" to "anon";

grant update on table "public"."budgets" to "anon";

grant delete on table "public"."budgets" to "authenticated";

grant insert on table "public"."budgets" to "authenticated";

grant references on table "public"."budgets" to "authenticated";

grant select on table "public"."budgets" to "authenticated";

grant trigger on table "public"."budgets" to "authenticated";

grant truncate on table "public"."budgets" to "authenticated";

grant update on table "public"."budgets" to "authenticated";

grant delete on table "public"."budgets" to "service_role";

grant insert on table "public"."budgets" to "service_role";

grant references on table "public"."budgets" to "service_role";

grant select on table "public"."budgets" to "service_role";

grant trigger on table "public"."budgets" to "service_role";

grant truncate on table "public"."budgets" to "service_role";

grant update on table "public"."budgets" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."transactions" to "anon";

grant insert on table "public"."transactions" to "anon";

grant references on table "public"."transactions" to "anon";

grant select on table "public"."transactions" to "anon";

grant trigger on table "public"."transactions" to "anon";

grant truncate on table "public"."transactions" to "anon";

grant update on table "public"."transactions" to "anon";

grant delete on table "public"."transactions" to "authenticated";

grant insert on table "public"."transactions" to "authenticated";

grant references on table "public"."transactions" to "authenticated";

grant select on table "public"."transactions" to "authenticated";

grant trigger on table "public"."transactions" to "authenticated";

grant truncate on table "public"."transactions" to "authenticated";

grant update on table "public"."transactions" to "authenticated";

grant delete on table "public"."transactions" to "service_role";

grant insert on table "public"."transactions" to "service_role";

grant references on table "public"."transactions" to "service_role";

grant select on table "public"."transactions" to "service_role";

grant trigger on table "public"."transactions" to "service_role";

grant truncate on table "public"."transactions" to "service_role";

grant update on table "public"."transactions" to "service_role";

create policy "Enable insert for authenticated users only"
on "public"."budget_users"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable users to view their own data only"
on "public"."budget_users"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "delete_budget_users"
on "public"."budget_users"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM budget_users owner
  WHERE ((owner.budget_id = budget_users.budget_id) AND (owner.user_id = auth.uid()) AND (owner.role = 'owner'::text) AND (owner.budget_id <> budget_users.budget_id)))));


create policy "Enable delete for users based on user_id"
on "public"."budgets"
as permissive
for delete
to authenticated
using ((id IN ( SELECT budget_users.budget_id
   FROM budget_users
  WHERE (budget_users.user_id = auth.uid()))));


create policy "Enable insert for authenticated users only"
on "public"."budgets"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable users to view their own data only"
on "public"."budgets"
as permissive
for select
to public
using ((id IN ( SELECT budget_users.budget_id
   FROM budget_users
  WHERE (budget_users.user_id = auth.uid()))));


create policy "Users can delete own categories"
on "public"."categories"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Users can insert own categories"
on "public"."categories"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can read own categories"
on "public"."categories"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "Users can update own categories"
on "public"."categories"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Service role can create profiles"
on "public"."profiles"
as permissive
for insert
to service_role
with check (true);


create policy "Service role can read all profiles"
on "public"."profiles"
as permissive
for select
to service_role
using (true);


create policy "Users can insert own profile"
on "public"."profiles"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can read own profile"
on "public"."profiles"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can delete own transactions"
on "public"."transactions"
as permissive
for delete
to authenticated
using ((auth.uid() = user_id));


create policy "Users can insert own transactions"
on "public"."transactions"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can read own transactions"
on "public"."transactions"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "Users can update own transactions"
on "public"."transactions"
as permissive
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER budget_after_insert AFTER INSERT ON public.budgets FOR EACH ROW EXECUTE FUNCTION add_budget_creator_to_users();


