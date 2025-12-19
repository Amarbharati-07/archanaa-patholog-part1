import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPinned, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface LabSettings {
  id: string;
  labName: string;
  labLatitude: string;
  labLongitude: string;
  maxCollectionDistance: number;
}

export default function AdminLabSettings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    labName: "Archana Pathology Lab",
    labLatitude: "",
    labLongitude: "",
    maxCollectionDistance: "40",
  });

  const { data: settings, isLoading } = useQuery<LabSettings>({
    queryKey: ["/api/admin/lab-settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        labName: settings.labName || "Archana Pathology Lab",
        labLatitude: settings.labLatitude || "",
        labLongitude: settings.labLongitude || "",
        maxCollectionDistance: String(settings.maxCollectionDistance || 40),
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/lab-settings", {
        ...data,
        maxCollectionDistance: Number(data.maxCollectionDistance),
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Lab settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lab-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save",
        description: error.message || "Unable to update settings.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.labLatitude || !formData.labLongitude) {
      toast({
        title: "Required Fields",
        description: "Please enter lab coordinates.",
        variant: "destructive",
      });
      return;
    }

    const lat = parseFloat(formData.labLatitude);
    const lng = parseFloat(formData.labLongitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast({
        title: "Invalid Latitude",
        description: "Latitude must be between -90 and 90.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      toast({
        title: "Invalid Longitude",
        description: "Longitude must be between -180 and 180.",
        variant: "destructive",
      });
      return;
    }

    updateSettingsMutation.mutate(formData);
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          labLatitude: position.coords.latitude.toFixed(6),
          labLongitude: position.coords.longitude.toFixed(6),
        });
        toast({
          title: "Location Detected",
          description: "Current location has been set as lab location.",
        });
      },
      (error) => {
        toast({
          title: "Location Error",
          description: "Unable to get current location. Please enter manually.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Lab Settings</h1>
          <p className="text-muted-foreground">Configure lab location and home collection settings</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinned className="h-5 w-5" />
                  Lab Location Settings
                </CardTitle>
                <CardDescription>
                  Set your lab's location to enable distance-based home collection validation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="labName">Lab Name</Label>
                  <Input
                    id="labName"
                    value={formData.labName}
                    onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                    placeholder="Enter lab name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="labLatitude">Lab Latitude</Label>
                    <Input
                      id="labLatitude"
                      type="number"
                      step="0.000001"
                      value={formData.labLatitude}
                      onChange={(e) => setFormData({ ...formData, labLatitude: e.target.value })}
                      placeholder="e.g., 28.6139"
                    />
                    <p className="text-xs text-muted-foreground">Value between -90 and 90</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="labLongitude">Lab Longitude</Label>
                    <Input
                      id="labLongitude"
                      type="number"
                      step="0.000001"
                      value={formData.labLongitude}
                      onChange={(e) => setFormData({ ...formData, labLongitude: e.target.value })}
                      placeholder="e.g., 77.2090"
                    />
                    <p className="text-xs text-muted-foreground">Value between -180 and 180</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={detectCurrentLocation}
                  className="gap-2"
                >
                  <MapPinned className="h-4 w-4" />
                  Use Current Location
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="maxCollectionDistance">Maximum Home Collection Distance (km)</Label>
                  <Input
                    id="maxCollectionDistance"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.maxCollectionDistance}
                    onChange={(e) => setFormData({ ...formData, maxCollectionDistance: e.target.value })}
                    placeholder="40"
                  />
                  <p className="text-xs text-muted-foreground">
                    Home collection will only be available for customers within this distance from the lab
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    className="gap-2"
                  >
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
