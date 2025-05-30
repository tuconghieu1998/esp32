const products = [
  // PCs
  { id: 1, name: "PC 1", image: "img/products/pc1.webp", quantity: 10, note: "Gaming rig", category: "PC" },
  { id: 2, name: "PC 2", image: "img/products/pc2.webp", quantity: 8, note: "Office use", category: "PC" },
  { id: 3, name: "PC 3", image: "img/products/pc3.webp", quantity: 5, note: "Development", category: "PC" },
  { id: 4, name: "PC 4", image: "img/products/pc4.webp", quantity: 12, note: "All-in-one", category: "PC" },
  { id: 5, name: "PC 5", image: "img/products/pc5.webp", quantity: 6, note: "Mini tower", category: "PC" },

  // Laptops
  { id: 6, name: "Laptop 1", image: "img/products/laptop1.webp", quantity: 15, note: "Ultrabook", category: "Laptop" },
  { id: 7, name: "Laptop 2", image: "img/products/laptop2.webp", quantity: 9, note: "Gaming laptop", category: "Laptop" },
  { id: 8, name: "Laptop 3", image: "img/products/laptop3.webp", quantity: 11, note: "Business laptop", category: "Laptop" },
  { id: 9, name: "Laptop 4", image: "img/products/laptop4.webp", quantity: 4, note: "Student laptop", category: "Laptop" },
  { id: 10, name: "Laptop 5", image: "img/products/laptop5.webp", quantity: 7, note: "Budget laptop", category: "Laptop" },

  // Monitors
  { id: 11, name: "Monitor 1", image: "img/products/monitor1.webp", quantity: 20, note: "24-inch LED", category: "Monitor" },
  { id: 12, name: "Monitor 2", image: "img/products/monitor2.webp", quantity: 14, note: "27-inch 4K", category: "Monitor" },
  { id: 13, name: "Monitor 3", image: "img/products/monitor3.webp", quantity: 18, note: "Curved monitor", category: "Monitor" },
  { id: 14, name: "Monitor 4", image: "img/products/monitor4.webp", quantity: 10, note: "IPS Panel", category: "Monitor" },
  { id: 15, name: "Monitor 5", image: "img/products/monitor5.webp", quantity: 16, note: "Gaming monitor", category: "Monitor" },
];



export async function getListProduct() {
    return products;
}

