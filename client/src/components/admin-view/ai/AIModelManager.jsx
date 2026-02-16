import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import recommendationApi from "@/api/recommendationApi";

const AIModelManager = () => {
  const { accessToken } = useSelector((s) => s.auth);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [lastTrained, setLastTrained] = useState(null);

  const handleRetrain = async () => {
    if (!accessToken) {
      toast.error("Vui lòng đăng nhập");
      return;
    }

    try {
      setLoading(true);
      const response = await recommendationApi.retrainModel(accessToken);

      if (response.success) {
        setStats(response.stats);
        setLastTrained(new Date());
        toast.success("Model đã được train lại thành công!");
      }
    } catch (error) {
      console.error("Error retraining model:", error);
      toast.error(error.response?.data?.message || "Không thể train lại model");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Quản lý AI Model
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Display */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {stats.users}
              </div>
              <div className="text-sm text-gray-600">Người dùng</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {stats.dishes}
              </div>
              <div className="text-sm text-gray-600">Món ăn</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {stats.interactions}
              </div>
              <div className="text-sm text-gray-600">Tương tác</div>
            </div>
          </div>
        )}

        {/* Last Trained Info */}
        {lastTrained && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="text-sm text-gray-700">
              <span className="font-medium">Lần train cuối:</span>{" "}
              {lastTrained.toLocaleString("vi-VN")}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Train lại model khi:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Có nhiều đơn hàng mới</li>
                <li>Thêm món ăn mới</li>
                <li>Cần cập nhật gợi ý cho khách hàng</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Retrain Button */}
        <Button
          onClick={handleRetrain}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang train model...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Train lại Model
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIModelManager;
