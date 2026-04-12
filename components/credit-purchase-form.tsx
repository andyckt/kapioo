"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Upload, X, Loader2, CreditCard, Check } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import {
  PaymentProofClientError,
  preparePaymentProofFile,
} from "@/lib/upload/payment-proof-client"

interface CreditPurchaseFormProps {
  userId: string;
  onSuccess?: () => void;
}

export function CreditPurchaseForm({ userId, onSuccess }: CreditPurchaseFormProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    referenceNumber: '',
    notes: '',
  });
  const [uploadedImage, setUploadedImage] = useState<{
    file: File | null;
    preview: string | null;
    url: string | null;
  }>({
    file: null,
    preview: null,
    url: null,
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set loading state
    setIsLoading(true);
    
    try {
      const processedFile = await preparePaymentProofFile(file)

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage({
          file: processedFile,
          preview: reader.result as string,
          url: null
        });
        setIsLoading(false);
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      console.error('Error processing file:', error);

      if (error instanceof PaymentProofClientError && error.code === 'invalid_type') {
        toast({
          title: language === 'en' ? "Invalid file type" : "无效的文件类型",
          description: language === 'en' ? "Please upload a valid image format" : "请上传有效的图片格式",
          variant: "destructive"
        });
      } else if (error instanceof PaymentProofClientError && error.code === 'too_large') {
        toast({
          title: language === 'en' ? "File too large" : "文件过大",
          description: language === 'en' ? "File size must be less than 5MB" : "文件大小必须小于5MB",
          variant: "destructive"
        });
      } else if (error instanceof PaymentProofClientError && error.code === 'conversion_failed') {
        toast({
          title: language === 'en' ? "Conversion failed" : "转换失败",
          description: language === 'en' ? "Failed to convert HEIC image. Please try another format." : "无法转换HEIC图片。请尝试其他格式。",
          variant: "destructive"
        });
      } else {
        toast({
          title: language === 'en' ? "Error" : "错误",
          description: language === 'en' ? "Failed to process the image" : "处理图片失败",
          variant: "destructive"
        });
      }

      setIsLoading(false);
    }
  };

  // Handle file upload
  const uploadFile = async () => {
    if (!uploadedImage.file) return null;

    const formData = new FormData();
    formData.append('file', uploadedImage.file);
    formData.append('userId', userId);

    try {
      const response = await fetch('/api/upload/proof', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return result.data.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.amount) {
      toast({
        title: language === 'en' ? "Missing information" : "缺少信息",
        description: language === 'en' ? "Please enter an amount" : "请输入金额",
        variant: "destructive"
      });
      return;
    }
    
    // Validate reference number
    if (!formData.referenceNumber) {
      toast({
        title: language === 'en' ? "Missing reference number" : "缺少参考号码",
        description: language === 'en' ? "Please enter the e-Transfer reference number" : "请输入电子转账参考号码",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file upload
    if (!uploadedImage.file) {
      toast({
        title: language === 'en' ? "Missing proof" : "缺少证明",
        description: language === 'en' ? "Please upload a screenshot of your e-Transfer" : "请上传您的电子转账截图",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload file first
      const imageUrl = await uploadFile();
      
      if (!imageUrl) {
        throw new Error('Failed to upload image');
      }
      
      // Parse amount
      const amount = parseFloat(formData.amount);
      
      // Create credit purchase request
      const response = await fetch('/api/credits/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount: amount,
          imageProof: imageUrl,
          referenceNumber: formData.referenceNumber,
          notes: formData.notes
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create request');
      }
      
      // Success
      setIsSuccess(true);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        // Slight delay to ensure the success message is seen
        setTimeout(() => {
          onSuccess();
          // Auto-close the dialog after a short delay
          setTimeout(() => {
            setIsOpen(false);
          }, 2000);
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: language === 'en' ? "Error" : "错误",
        description: language === 'en' ? "Failed to submit request. Please try again." : "提交请求失败。请重试。",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    if (!isLoading) {
      setIsSuccess(false);
      setFormData({
        amount: '',
        referenceNumber: '',
        notes: '',
      });
      setUploadedImage({
        file: null,
        preview: null,
        url: null
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) handleDialogClose();
    }}>
      <DialogTrigger asChild>
        <Button 
          className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all duration-300 gap-2"
        >
          <CreditCard className="h-4 w-4" />
          {language === 'en' ? 'Purchase Credits' : '购买餐券'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {!isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>{language === 'en' ? 'Purchase Credits' : '购买餐券'}</DialogTitle>
              <DialogDescription>
                {language === 'en' 
                  ? 'Enter amount and upload payment proof.' 
                  : '输入金额并上传付款证明。'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">{language === 'en' ? 'Amount' : '金额'}</Label>
                  <Input 
                    id="amount" 
                    value={formData.amount} 
                    onChange={handleInputChange} 
                    className="mt-2"
                    placeholder={language === 'en' ? 'Enter amount' : '输入金额'}
                    type="number"
                    min="1"
                    step="1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="referenceNumber">
                    {language === 'en' ? 'Reference Number' : '参考号码'}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input 
                    id="referenceNumber" 
                    value={formData.referenceNumber} 
                    onChange={handleInputChange} 
                    className="mt-2"
                    placeholder={language === 'en' ? 'Enter e-Transfer reference number' : '输入电子转账参考号码'}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">
                    {language === 'en' ? 'Notes (Optional)' : '备注（可选）'}
                  </Label>
                  <Textarea 
                    id="notes" 
                    value={formData.notes} 
                    onChange={handleInputChange} 
                    className="mt-2"
                    placeholder={language === 'en' 
                      ? 'Any additional information for this request' 
                      : '此请求的任何其他信息'
                    }
                  />
                </div>
                
                <div>
                  <Label>
                    {language === 'en' ? 'Upload Payment Proof' : '上传付款证明'}
                  </Label>
                  <div 
                    className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors relative" 
                    onClick={() => document.getElementById('proof-upload')?.click()}
                  >
                    <input
                      type="file"
                      id="proof-upload"
                      className="hidden"
                      accept="image/jpeg,image/png,image/jpg,image/webp,image/heic,image/heif,image/tiff,image/bmp"
                      onChange={handleFileChange}
                    />
                    
                    {!uploadedImage.preview ? (
                      <div className="space-y-2">
                        {isLoading ? (
                          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                          </div>
                        ) : (
                          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {language === 'en' ? 'Click to upload' : '点击上传'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <img 
                          src={uploadedImage.preview} 
                          alt="Payment proof" 
                          className="max-h-[200px] mx-auto rounded-md"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedImage({ file: null, preview: null, url: null });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'en' ? 'Submitting...' : '提交中...'}
                    </>
                  ) : (
                    language === 'en' ? 'Submit Request' : '提交请求'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-medium text-[#8A5A34]">
                {language === 'en' ? 'Thank You!' : '谢谢！'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <div className="bg-[#F9F3EC] border border-[#D1A46C] rounded-lg p-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#F2E8D9] flex items-center justify-center mb-2">
                  <Check className="h-8 w-8 text-[#C2884E]" />
                </div>
                <p className="text-[#9B6B3F] mb-4">
                  {language === 'en'
                    ? 'Your request is now pending approval. We process in 30-60 mins during business hours Monday to Friday 11am to 8pm.'
                    : '您的请求正在等待批准。我们将在营业时间内（周一至周五上午11点至晚上8点）30-60分钟内处理。'
                  }
                </p>
                <div className="border-t border-[#E5D6BC] pt-4 mt-4">
                  <p className="text-sm text-[#9B6B3F]">
                    {language === 'en'
                      ? 'You can check the status of your request in the "Credit Requests" section.'
                      : '您可以在"餐券请求"部分查看请求状态。'
                    }
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsOpen(false)}>
                {language === 'en' ? 'Close' : '关闭'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}