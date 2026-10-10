import DishCard from "./DishCard";

export default function DishList({ dishes }) {
  if (!dishes || dishes.length === 0) {
    return <p className="py-10 text-center text-neutral-400">No dishes in this category yet.</p>;
  }

  return (
    <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
      {dishes.map((dish, index) => (
        <DishCard key={dish.id} dish={dish} priority={index === 0} />
      ))}
    </ul>
  );
}