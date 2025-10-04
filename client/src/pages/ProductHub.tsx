import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import type { Product, InsertProduct } from "@shared/schema";
import { z } from "zod";
import {
  Plus,
  Search,
  Layers,
  Rocket,
  Target,
  TrendingUp,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  LayoutGrid,
  LayoutList,
  Columns3,
} from "lucide-react";

// Product status configuration
const PRODUCT_STATUSES = {
  discovery: { label: "Discovery", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  development: { label: "Development", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  launched: { label: "Launched", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  maintenance: { label: "Maintenance", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  sunset: { label: "Sunset", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
};

const PRODUCT_TYPES = {
  internal: { label: "Internal", icon: Package },
  client: { label: "Client", icon: Target },
  saas: { label: "SaaS", icon: Rocket },
};

// Form schema
const productFormSchema = insertProductSchema.pick({
  name: true,
  description: true,
  productType: true,
  status: true,
  vision: true,
  targetAudience: true,
});

type ProductFormData = z.infer<typeof productFormSchema>;

// Product Form Component
function ProductForm({ product, onSuccess }: { product?: Product; onSuccess: () => void }) {
  const { toast } = useToast();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      productType: product?.productType || "internal",
      status: product?.status || "discovery",
      vision: product?.vision || "",
      targetAudience: product?.targetAudience || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch immediately
      await queryClient.invalidateQueries({
        queryKey: ["/api/products"],
        refetchType: 'active',
      });
      toast({ title: "Product created successfully" });
      onSuccess();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertProduct>) => {
      const response = await apiRequest("PATCH", `/api/products/${product?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product updated successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (product) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as InsertProduct);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., BizOS Platform" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief description of the product" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="productType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="discovery">Discovery</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="launched">Launched</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="sunset">Sunset</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="vision"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Vision</FormLabel>
              <FormControl>
                <Textarea placeholder="What is the long-term vision for this product?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetAudience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Audience</FormLabel>
              <FormControl>
                <Textarea placeholder="Who is this product for?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {product ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Product Card Component (reusable)
function ProductCard({
  product,
  onEdit,
  onDelete,
  onClick
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const TypeIcon = PRODUCT_TYPES[product.productType as keyof typeof PRODUCT_TYPES]?.icon || Package;
  const statusConfig = PRODUCT_STATUSES[product.status as keyof typeof PRODUCT_STATUSES] || PRODUCT_STATUSES.discovery;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5 text-gray-500" />
            <CardTitle className="text-lg">{product.name}</CardTitle>
          </div>
          <Badge className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {product.description || "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {product.vision && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Vision</p>
              <p className="text-sm line-clamp-2">{product.vision}</p>
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <Badge variant="outline">
              {PRODUCT_TYPES[product.productType as keyof typeof PRODUCT_TYPES]?.label || product.productType}
            </Badge>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Board View Component
function BoardView({
  products,
  onEdit,
  onDelete,
  onNavigate
}: {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onNavigate: (productId: string) => void;
}) {
  const statuses: Array<keyof typeof PRODUCT_STATUSES> = [
    "discovery",
    "development",
    "launched",
    "maintenance",
    "sunset",
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => {
        const statusConfig = PRODUCT_STATUSES[status];
        const statusProducts = products.filter((p) => p.status === status);

        return (
          <div key={status} className="flex-shrink-0 w-80">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                  <span className="text-sm text-gray-500">({statusProducts.length})</span>
                </h3>
              </div>
              <div className="space-y-3">
                {statusProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={() => onEdit(product)}
                    onDelete={() => onDelete(product.id)}
                    onClick={() => onNavigate(product.id)}
                  />
                ))}
                {statusProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No products
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Table View Component
function TableView({
  products,
  onEdit,
  onDelete,
  onNavigate
}: {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onNavigate: (productId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => {
                const TypeIcon = PRODUCT_TYPES[product.productType as keyof typeof PRODUCT_TYPES]?.icon || Package;
                const statusConfig = PRODUCT_STATUSES[product.status as keyof typeof PRODUCT_STATUSES] || PRODUCT_STATUSES.discovery;

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => onNavigate(product.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {PRODUCT_TYPES[product.productType as keyof typeof PRODUCT_TYPES]?.label || product.productType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <span className="text-sm text-gray-600 line-clamp-1">
                        {product.description || "No description"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Product Hub Component
type ViewMode = "grid" | "board" | "table";

export default function ProductHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Fetch products
  const { data: products = [], isLoading, refetch, error } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 0, // Always refetch to ensure fresh data
  });

  // Debug logging
  console.log('ProductHub - isLoading:', isLoading);
  console.log('ProductHub - products:', products);
  console.log('ProductHub - products.length:', products?.length);
  console.log('ProductHub - error:', error);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter products
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout
      title="Product Management"
      subtitle="Manage your product portfolio, epics, and features"
      icon={Layers}
      user={user}
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "board" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("board")}
            title="Board View"
          >
            <Columns3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            title="Table View"
          >
            <LayoutList className="w-4 h-4" />
          </Button>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
            </DialogHeader>
            <ProductForm onSuccess={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Development</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter((p) => p.status === "development").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Launched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter((p) => p.status === "launched").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">In Discovery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter((p) => p.status === "discovery").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Display */}
      {isLoading ? (
        <div className="text-center py-12">Loading products...</div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-red-500 mb-4">Error loading products</div>
            <p className="text-sm text-gray-600 mb-4">{String(error)}</p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No products yet</h3>
            <p className="text-gray-500 mb-2">
              Get started by creating your first product
            </p>
            <p className="text-xs text-gray-400 mb-4">
              (Total fetched: {products.length}, Filtered: {filteredProducts.length})
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Product
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "board" ? (
        <BoardView
          products={filteredProducts}
          onEdit={(product) => {
            setEditingProduct(product);
            setIsCreateDialogOpen(true);
          }}
          onDelete={(productId) => {
            if (confirm("Are you sure you want to delete this product?")) {
              deleteMutation.mutate(productId);
            }
          }}
          onNavigate={(productId) => navigate(`/product/${productId}`)}
        />
      ) : viewMode === "table" ? (
        <TableView
          products={filteredProducts}
          onEdit={(product) => {
            setEditingProduct(product);
            setIsCreateDialogOpen(true);
          }}
          onDelete={(productId) => {
            if (confirm("Are you sure you want to delete this product?")) {
              deleteMutation.mutate(productId);
            }
          }}
          onNavigate={(productId) => navigate(`/product/${productId}`)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => {
                setEditingProduct(product);
                setIsCreateDialogOpen(true);
              }}
              onDelete={() => {
                if (confirm("Are you sure you want to delete this product?")) {
                  deleteMutation.mutate(product.id);
                }
              }}
              onClick={() => navigate(`/product/${product.id}`)}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen && !!editingProduct}
        onOpenChange={(open) => {
          if (!open) setEditingProduct(null);
          setIsCreateDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              product={editingProduct}
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                setEditingProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
