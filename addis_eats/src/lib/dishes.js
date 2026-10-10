export async function getDishes() {
  return [
    {
      id: "d1",
      name: "Special Doro Wat",
      image: "/dishes/doro-wat.webp",
      category: "Ethiopian",
      price: 450,
      description:
        "Slow-cooked tender chicken in rich berbere sauce with caramelized red onions, served with egg and fresh injera.",
    },
    {
      id: "d2",
      name: "Sizzling Shekla Tibs",
      image: "/dishes/sizzling-shekla-tibs.webp",
      category: "Ethiopian",
      price: 420,
      description:
        "Tender beef cubes sautéed with rosemary, garlic, red onions, and jalapeños, served hot on a clay burner.",
    },
    {
      id: "d3",
      name: "Beyaynetu (Veggie Combo)",
      image: "/dishes/bayenetu.webp",
      category: "Ethiopian",
      price: 320,
      description:
        "A colorful vegan spread of red lentils, split peas, collard greens, and beetroot salad served with teff injera.",
    },
    {
      id: "d4",
      name: "Bole Special Kitfo",
      image: "/dishes/bole-special-kitfo.webp",
      category: "Ethiopian",
      price: 480,
      description:
        "Minced beef warmed with mitmita and seasoned butter, accompanied by ayib cheese and gomen kitfo.",
    },
    {
      id: "d5",
      name: "Addis Supreme Pizza",
      image: "/dishes/addis-supreme-pizza.webp",
      category: "Pizza",
      price: 390,
      description:
        "Stone-baked crust loaded with spiced beef, mozzarella, bell peppers, black olives, and fresh basil.",
    },
    {
      id: "d6",
      name: "Margherita Classica",
      image: "/dishes/margherita-classica.webp",
      category: "Pizza",
      price: 340,
      description:
        "Traditional pizza with tomato, creamy mozzarella, olive oil, and aromatic sweet basil.",
    },
    {
      id: "d7",
      name: "BBQ Chicken Pizza",
      image: "/dishes/bbq-chicken-pizza.webp",
      category: "Pizza",
      price: 410,
      description:
        "Smoky barbecue sauce, grilled chicken, red onions, provolone, and cheddar on a crisp crust.",
    },
    {
      id: "d8",
      name: "Addis Gourmet Double Smash",
      image: "/dishes/addis-double-smash.webp",
      category: "Burgers",
      price: 380,
      description:
        "Two smashed beef patties with double cheddar, truffle mayo, caramelized shallots, and lettuce on brioche.",
    },
    {
      id: "d9",
      name: "Crispy Zesty Chicken Burger",
      image: "/dishes/crispy-chicken-burger.webp",
      category: "Burgers",
      price: 350,
      description:
        "Golden buttermilk-fried chicken with jalapeño slaw, house dressing, and crunchy dill pickles.",
    },
    {
      id: "d10",
      name: "Garden Veggie & Avocado Burger",
      image: "/dishes/veggie-avocado-burger.webp",
      category: "Burgers",
      price: 310,
      description:
        "A quinoa and black bean patty with avocado, tomato, spinach, and vegan chipotle aioli.",
    },
    {
      id: "d11",
      name: "Traditional Buna (Ethiopian Coffee)",
      image: "/dishes/ethiopian-coffee.webp",
      category: "Drinks",
      price: 90,
      description:
        "Ceremonial jebena coffee brewed from freshly roasted Yirgacheffe beans, served with popcorn and rue.",
    },
    {
      id: "d12",
      name: "Fresh Layered Spris Juice",
      image: "/dishes/spris-juice.webp",
      category: "Drinks",
      price: 140,
      description:
        "A fresh layered juice of avocado, mango, and papaya with a dash of lime.",
    },
    {
      id: "d13",
      name: "Honey Tej (Fermented Honey Wine)",
      image: "/dishes/honey-tej.webp",
      category: "Drinks",
      price: 180,
      description:
        "Traditional honey wine naturally fermented with Gesho, with a sweet floral taste.",
    },
  ];
}

export function getDishCardImage(image) {
  return image.replace("/dishes/", "/dishes/display/card/");
}

export function getDishDetailImage(image) {
  return image.replace("/dishes/", "/dishes/display/detail/");
}

export async function findDish(id) {
  const dishes = await getDishes();
  return dishes.find((dish) => dish.id === id) || null;
}
