export default function Loading() {
  return (
    <div aria-label="正在载入">
      <div className="skeleton mb-7 h-11 w-44 rounded-[18px]" />
      <div className="skeleton h-[420px] w-full rounded-[30px]" />
    </div>
  );
}
