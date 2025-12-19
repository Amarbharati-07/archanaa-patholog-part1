import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Package, IndianRupee } from "lucide-react";
import { getPackageImage } from "@/lib/test-images";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { HealthPackage, Test } from "@shared/schema";

const categories = ["men", "women", "general"];

export default function AdminHealthPackages() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<HealthPackage | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "general",
    description: "",
    testIds: [] as string[],
    reportTime: "24-48 hours",
    originalPrice: "",
    discountPercentage: 0,
    isActive: true,
    imageUrl: "",
  });

  const { data: packages, isLoading } = useQuery<HealthPackage[]>({
    queryKey: ["/api/admin/health-packages"],
  });

  const { data: tests } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/health-packages", data),
    onSuccess: () => {
      toast({ title: "Package created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/health-packages"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create package", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/health-packages/${id}`, data),
    onSuccess: () => {
      toast({ title: "Package updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/health-packages"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update package", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/health-packages/${id}`),
    onSuccess: () => {
      toast({ title: "Package deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/health-packages"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete package", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "general",
      description: "",
      testIds: [],
      reportTime: "24-48 hours",
      originalPrice: "",
      discountPercentage: 0,
      isActive: true,
      imageUrl: "",
    });
    setEditingPackage(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (pkg: HealthPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      category: pkg.category,
      description: pkg.description || "",
      testIds: pkg.testIds,
      reportTime: pkg.reportTime,
      originalPrice: String(pkg.originalPrice),
      discountPercentage: pkg.discountPercentage,
      isActive: pkg.isActive,
      imageUrl: pkg.imageUrl || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      originalPrice: formData.originalPrice,
    };

    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleTestSelection = (testId: string) => {
    setFormData(prev => ({
      ...prev,
      testIds: prev.testIds.includes(testId)
        ? prev.testIds.filter(id => id !== testId)
        : [...prev.testIds, testId],
    }));
  };

  const calculateDiscountedPrice = () => {
    const original = parseFloat(formData.originalPrice) || 0;
    return original * (1 - formData.discountPercentage / 100);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Health Packages</h1>
            <p className="text-muted-foreground">Manage health checkup packages and pricing</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPackage ? "Edit Package" : "Create New Package"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Package Name</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reportTime">Report Time</Label>
                    <Input id="reportTime" value={formData.reportTime} onChange={(e) => setFormData({ ...formData, reportTime: e.target.value })} placeholder="e.g., 24-48 hours" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">Original Price (₹)</Label>
                    <Input id="originalPrice" type="number" value={formData.originalPrice} onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount Percentage (%)</Label>
                    <Input id="discount" type="number" min="0" max="100" value={formData.discountPercentage} onChange={(e) => setFormData({ ...formData, discountPercentage: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Final Price</Label>
                    <div className="h-10 flex items-center text-lg font-semibold text-primary">
                      ₹{calculateDiscountedPrice().toFixed(0)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input 
                    id="imageUrl" 
                    value={formData.imageUrl} 
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} 
                    placeholder="https://example.com/image.jpg" 
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use default category image</p>
                </div>

                <div className="space-y-2">
                  <Label>Select Tests ({formData.testIds.length} selected)</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {tests?.map(test => (
                      <label key={test.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${formData.testIds.includes(test.id) ? 'bg-primary/10' : ''}`}>
                        <input type="checkbox" checked={formData.testIds.includes(test.id)} onChange={() => toggleTestSelection(test.id)} className="rounded" />
                        <span className="flex-1">{test.name}</span>
                        <span className="text-sm text-muted-foreground">₹{Number(test.price).toFixed(0)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch id="isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
                  <Label htmlFor="isActive">Active</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingPackage ? "Update" : "Create"} Package
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : packages && packages.length > 0 ? (
          <div className="grid gap-4">
            {packages.map(pkg => {
              const discounted = Number(pkg.originalPrice) * (1 - pkg.discountPercentage / 100);
              return (
                <Card key={pkg.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="w-16 h-16 rounded-md overflow-hidden shrink-0">
                        <img 
                          src={getPackageImage(pkg.category, pkg.imageUrl)} 
                          alt={pkg.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{pkg.name}</h3>
                          <Badge variant={pkg.isActive ? "default" : "secondary"}>
                            {pkg.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="capitalize">{pkg.category}</Badge>
                          {pkg.discountPercentage > 0 && (
                            <Badge variant="destructive">{pkg.discountPercentage}% OFF</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {pkg.testIds.length} tests
                          </span>
                          <span>Reports: {pkg.reportTime}</span>
                          <span className="flex items-center gap-1 font-semibold text-primary">
                            <IndianRupee className="h-4 w-4" />
                            {discounted.toFixed(0)}
                            {pkg.discountPercentage > 0 && (
                              <span className="text-muted-foreground line-through font-normal ml-1">
                                ₹{Number(pkg.originalPrice).toFixed(0)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(pkg)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(pkg.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No packages yet</h3>
              <p className="text-muted-foreground mb-4">Create your first health package to get started.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Package
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
