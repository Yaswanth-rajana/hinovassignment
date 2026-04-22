alter table public.posts
  add column if not exists author_name text,
  add column if not exists author_role text;

alter table public.comments
  add column if not exists user_name text;

update public.posts as p
set
  author_name = u.name,
  author_role = u.role
from public.users as u
where p.author_id = u.id
  and (
    p.author_name is distinct from u.name
    or p.author_role is distinct from u.role
  );

update public.comments as c
set user_name = u.name
from public.users as u
where c.user_id = u.id
  and c.user_name is distinct from u.name;

create or replace function public.sync_post_author_snapshot()
returns trigger
language plpgsql
as $$
begin
  select u.name, u.role
  into new.author_name, new.author_role
  from public.users as u
  where u.id = new.author_id;

  return new;
end;
$$;

drop trigger if exists sync_post_author_snapshot on public.posts;

create trigger sync_post_author_snapshot
before insert or update of author_id
on public.posts
for each row
execute function public.sync_post_author_snapshot();

create or replace function public.sync_comment_user_snapshot()
returns trigger
language plpgsql
as $$
begin
  select u.name
  into new.user_name
  from public.users as u
  where u.id = new.user_id;

  return new;
end;
$$;

drop trigger if exists sync_comment_user_snapshot on public.comments;

create trigger sync_comment_user_snapshot
before insert or update of user_id
on public.comments
for each row
execute function public.sync_comment_user_snapshot();

create or replace function public.propagate_user_snapshot_updates()
returns trigger
language plpgsql
as $$
begin
  update public.posts
  set
    author_name = new.name,
    author_role = new.role
  where author_id = new.id
    and (
      author_name is distinct from new.name
      or author_role is distinct from new.role
    );

  update public.comments
  set user_name = new.name
  where user_id = new.id
    and user_name is distinct from new.name;

  return new;
end;
$$;

drop trigger if exists propagate_user_snapshot_updates on public.users;

create trigger propagate_user_snapshot_updates
after update of name, role
on public.users
for each row
execute function public.propagate_user_snapshot_updates();
