import ToolTip from '@/components/ToolTip'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { notify } from '@/components/ui/sonner'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { LLMConfig } from '@/types/llm_config'
import { getApiUrl } from '@/utils/api'
import { DALLE_3_QUALITY_OPTIONS, GPT_IMAGE_1_5_QUALITY_OPTIONS, IMAGE_PROVIDERS } from '@/utils/providerConstants'
import { Check, ChevronUp, Eye, EyeOff, Loader2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

const ImageProvider = ({ llmConfig, setLlmConfig }: { llmConfig: LLMConfig, setLlmConfig: (config: any) => void }) => {
    const [openImageProviderSelect, setOpenImageProviderSelect] = useState(false);
    const [openCustomImageModelSelect, setOpenCustomImageModelSelect] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [customImageModels, setCustomImageModels] = useState<string[]>([]);
    const [customImageModelsLoading, setCustomImageModelsLoading] = useState(false);
    const [customImageModelsChecked, setCustomImageModelsChecked] = useState(false);
    const fetchGenerationRef = useRef(0);

    const isImageGenerationDisabled = llmConfig.DISABLE_IMAGE_GENERATION ?? false;
    const handleChangeImageGenerationDisabled = (value: boolean) => {
        setLlmConfig((prev: any) => ({
            ...prev,
            DISABLE_IMAGE_GENERATION: value
        }));
    }
    const input_field_changed = (value: string, field: string) => {
        setLlmConfig((prev: any) => ({
            ...prev,
            [field]: value
        }));
        setOpenImageProviderSelect(false);
    }

    const getFieldValue = (field?: string) => {
        if (!field) return "";
        return (llmConfig as Record<string, string | undefined>)[field] || "";
    };

    const updateFieldValue = (field: string | undefined, value: string) => {
        if (!field) return;
        setLlmConfig((prev: any) => ({
            ...prev,
            [field]: value,
        }));
    };

    const fetchCustomImageModels = async () => {
        if (!llmConfig.CUSTOM_IMAGE_URL) return;
        const generation = ++fetchGenerationRef.current;
        setCustomImageModels([]);
        setCustomImageModelsChecked(false);
        setCustomImageModelsLoading(true);
        try {
            const response = await fetch(getApiUrl('/api/v1/ppt/openai/models/available'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: llmConfig.CUSTOM_IMAGE_URL,
                    api_key: llmConfig.CUSTOM_IMAGE_API_KEY || '',
                }),
            });
            if (fetchGenerationRef.current !== generation) return;
            if (response.ok) {
                const data = await response.json();
                const models: string[] = Array.isArray(data) ? data : [];
                setCustomImageModels(models);
                setCustomImageModelsChecked(true);
                if (models.length > 0 && !llmConfig.CUSTOM_IMAGE_MODEL) {
                    setLlmConfig((prev: any) => ({ ...prev, CUSTOM_IMAGE_MODEL: models[0] }));
                }
            } else {
                setCustomImageModels([]);
                setCustomImageModelsChecked(true);
                notify.error('Could not load models', 'Check your URL and API key and try again.');
            }
        } catch {
            if (fetchGenerationRef.current !== generation) return;
            setCustomImageModels([]);
            setCustomImageModelsChecked(true);
            notify.error('Could not load models', 'Something went wrong while contacting the provider.');
        } finally {
            if (fetchGenerationRef.current === generation) {
                setCustomImageModelsLoading(false);
            }
        }
    };

    // Reset models when URL changes; cancel any in-flight fetch
    useEffect(() => {
        fetchGenerationRef.current++;
        setCustomImageModels([]);
        setCustomImageModelsChecked(false);
        setCustomImageModelsLoading(false);
    }, [llmConfig.CUSTOM_IMAGE_URL]);

    // Auto-fetch when URL is pre-populated from env and provider is custom_image
    useEffect(() => {
        if (
            llmConfig.IMAGE_PROVIDER === 'custom_image' &&
            llmConfig.CUSTOM_IMAGE_URL &&
            !customImageModelsChecked &&
            !customImageModelsLoading
        ) {
            void fetchCustomImageModels();
        }
    }, [llmConfig.IMAGE_PROVIDER, llmConfig.CUSTOM_IMAGE_URL, customImageModelsChecked, customImageModelsLoading]);

    // Reset when switching away from custom_image; cancel any in-flight fetch
    useEffect(() => {
        if (llmConfig.IMAGE_PROVIDER !== 'custom_image') {
            fetchGenerationRef.current++;
            setCustomImageModels([]);
            setCustomImageModelsChecked(false);
            setCustomImageModelsLoading(false);
        }
    }, [llmConfig.IMAGE_PROVIDER]);

    const renderQualitySelector = (llmConfig: LLMConfig, input_field_changed: (value: string, field: string) => void) => {
        if (llmConfig.IMAGE_PROVIDER === "dall-e-3") {
            return (
                <div className="w-[205px] mr-0 ml-auto">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        DALL·E 3 Image Quality
                    </label>
                    <div className="">
                        <Select value={llmConfig.DALL_E_3_QUALITY} onValueChange={(value) => input_field_changed(value, "DALL_E_3_QUALITY")}>
                            <SelectTrigger className="w-full h-12 px-4 py-4 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors hover:border-gray-400 justify-between">
                                <SelectValue placeholder="Select a quality" />
                            </SelectTrigger>
                            <SelectContent>
                                {DALLE_3_QUALITY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );
        }

        if (llmConfig.IMAGE_PROVIDER === "gpt-image-1.5") {
            return (
                <div className="w-[205px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        GPT Image 1.5 Quality
                    </label>
                    <div className="">
                        <Select
                            value={llmConfig.GPT_IMAGE_1_5_QUALITY}
                            onValueChange={(value) => input_field_changed(value, "GPT_IMAGE_1_5_QUALITY")}
                        >
                            <SelectTrigger className="w-full h-12 px-4 py-4 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors hover:border-gray-400 justify-between">
                                <SelectValue placeholder="Select a quality" />
                            </SelectTrigger>
                            <SelectContent>
                                {GPT_IMAGE_1_5_QUALITY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="space-y-6 bg-[#F9F8F8] p-7 rounded-[12px] ">
            {/* API Key Input */}
            <div className="mb-4  bg-white p-10 pt-5 rounded-[12px]">
                <ToolTip content="Enable/Disable Image Generation" className='flex justify-end items-center'>
                    <div className='flex justify-end items-center'>
                        <Switch
                            checked={!isImageGenerationDisabled}
                            className='data-[state=checked]:bg-[#4791FF] data-[state=unchecked]:bg-gray-400'
                            onCheckedChange={(checked) => handleChangeImageGenerationDisabled(!checked)}
                        />
                    </div>
                </ToolTip>
                <div className='flex items-center justify-between'>
                    <div className=" max-w-[290px] pb-[50px]">
                        <div className='w-[60px] h-[60px] px-[13.5px] py-[14.2px] rounded-[4px] flex items-center justify-center'
                            style={{ backgroundColor: '#F4F3FF' }}
                        >
                            <img src="/image-markup.svg" className='w-full h-full object-cover' alt='image-markup' />
                        </div>
                        <h3 className="text-xl font-normal text-[#191919] py-2.5">Image Generation Settings</h3>
                        <p className=" text-sm  text-gray-500">
                            Choosing where images come from
                        </p>
                    </div>
                    <div className=' '>
                        <div className='flex items-center justify-end gap-4'>
                            {!isImageGenerationDisabled && (
                                <>
                                    {/* Image Provider Selection */}
                                    <div className="">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Image Provider
                                        </label>
                                        <div className="w-full">
                                            <Popover
                                                open={openImageProviderSelect}
                                                onOpenChange={setOpenImageProviderSelect}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openImageProviderSelect}
                                                        className="w-[205px] h-12 px-4 py-4 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors hover:border-gray-400 justify-between"
                                                    >
                                                        <div className="flex gap-3 items-center">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {llmConfig.IMAGE_PROVIDER
                                                                    ? IMAGE_PROVIDERS[llmConfig.IMAGE_PROVIDER]
                                                                        ?.label || llmConfig.IMAGE_PROVIDER
                                                                    : "Select image provider"}
                                                            </span>
                                                        </div>
                                                        <ChevronUp className="w-4 h-4 text-gray-500" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="p-0"
                                                    align="start"
                                                    style={{ width: "var(--radix-popover-trigger-width)" }}
                                                >
                                                    <Command>
                                                        <CommandInput placeholder="Search provider..." />
                                                        <CommandList>
                                                            <CommandEmpty>No provider found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {Object.values(IMAGE_PROVIDERS).map(
                                                                    (provider, index) => (
                                                                        <CommandItem
                                                                            key={index}
                                                                            value={provider.value}
                                                                            onSelect={(value) => {
                                                                                input_field_changed(value, "IMAGE_PROVIDER");
                                                                                setOpenImageProviderSelect(false);
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    llmConfig.IMAGE_PROVIDER === provider.value
                                                                                        ? "opacity-100"
                                                                                        : "opacity-0"
                                                                                )}
                                                                            />
                                                                            <div className="flex gap-3 items-center">
                                                                                <div className="flex flex-col space-y-1 flex-1">
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        <span className="text-sm font-medium text-gray-900 capitalize">
                                                                                            {provider.label}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="text-xs text-gray-600 leading-relaxed">
                                                                                        {provider.description}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </CommandItem>
                                                                    )
                                                                )}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>

                                    {/* Dynamic API Key Input for Image Provider */}
                                    {llmConfig.IMAGE_PROVIDER &&
                                        IMAGE_PROVIDERS[llmConfig.IMAGE_PROVIDER] &&
                                        (() => {
                                            const provider = IMAGE_PROVIDERS[llmConfig.IMAGE_PROVIDER];

                                            // Show ComfyUI configuration
                                            if (provider.value === "comfyui") {
                                                return (
                                                    <div className=" space-y-4">
                                                        <div className='w-[205px]'>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                ComfyUI Server URL
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="http://192.168.1.7:8188"
                                                                    className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                    value={llmConfig.COMFYUI_URL || ""}
                                                                    onChange={(e) => {
                                                                        input_field_changed(
                                                                            e.target.value,
                                                                            "COMFYUI_URL"
                                                                        );
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Show Open WebUI configuration
                                            if (provider.value === "open_webui") {
                                                return (
                                                    <div className="space-y-4">
                                                        <div className='w-[205px]'>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Open WebUI URL
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="http://localhost:3000/api/v1"
                                                                    className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                    value={llmConfig.OPEN_WEBUI_IMAGE_URL || ""}
                                                                    onChange={(e) => {
                                                                        input_field_changed(
                                                                            e.target.value,
                                                                            "OPEN_WEBUI_IMAGE_URL"
                                                                        );
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Show Custom Image (OpenAI-compatible) URL
                                            if (provider.value === "custom_image") {
                                                return (
                                                    <div className="space-y-4">
                                                        <div className='w-[205px]'>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Base URL
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="https://api.example.com/v1"
                                                                    className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                    value={llmConfig.CUSTOM_IMAGE_URL || ""}
                                                                    onChange={(e) => {
                                                                        setLlmConfig((prev: any) => ({
                                                                            ...prev,
                                                                            CUSTOM_IMAGE_URL: e.target.value,
                                                                            CUSTOM_IMAGE_MODEL: '',
                                                                        }));
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Show API key input for other providers
                                            return (
                                                <div className=" w-[205px]">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        {provider.apiKeyFieldLabel}
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type={showApiKey ? 'text' : 'password'}
                                                            placeholder={`Enter your ${provider.apiKeyFieldLabel}`}
                                                            className="w-full px-4 py-2.5 h-12 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                            value={getFieldValue(provider.apiKeyField)}
                                                            onChange={(e) =>
                                                                updateFieldValue(
                                                                    provider.apiKeyField,
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowApiKey((prev) => !prev)}
                                                            className='absolute right-2 top-1/2 -translate-y-1/2 bg-white px-2 py-1 cursor-pointer'
                                                        >
                                                            {showApiKey ? <Eye className='w-4 h-4 text-gray-500' /> : <EyeOff className='w-4 h-4 text-gray-500' />}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                </>
                            )}
                        </div>
                        {!isImageGenerationDisabled && <div className='flex justify-end items-center mt-[18px]'>
                            {renderQualitySelector(llmConfig, input_field_changed)}
                            {llmConfig.IMAGE_PROVIDER === "open_webui" && (
                                <div className='w-[205px]'>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        API Key (optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            placeholder="API key"
                                            className="w-full px-4 py-2.5 h-12 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                            value={llmConfig.OPEN_WEBUI_IMAGE_API_KEY || ""}
                                            onChange={(e) => {
                                                input_field_changed(e.target.value, "OPEN_WEBUI_IMAGE_API_KEY");
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey((prev) => !prev)}
                                            className='absolute right-2 top-1/2 -translate-y-1/2 bg-white px-2 py-1 cursor-pointer'
                                        >
                                            {showApiKey ? <Eye className='w-4 h-4 text-gray-500' /> : <EyeOff className='w-4 h-4 text-gray-500' />}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {llmConfig.IMAGE_PROVIDER === "custom_image" && (
                                <div className='flex flex-col gap-3 items-end'>
                                    {/* API Key */}
                                    <div className='w-[205px]'>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            API Key (optional)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showApiKey ? 'text' : 'password'}
                                                placeholder="API key"
                                                className="w-full px-4 py-2.5 h-12 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                value={llmConfig.CUSTOM_IMAGE_API_KEY || ""}
                                                onChange={(e) => {
                                                    fetchGenerationRef.current++;
                                                    setCustomImageModels([]);
                                                    setCustomImageModelsChecked(false);
                                                    setCustomImageModelsLoading(false);
                                                    input_field_changed(e.target.value, "CUSTOM_IMAGE_API_KEY");
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey((prev) => !prev)}
                                                className='absolute right-2 top-1/2 -translate-y-1/2 bg-white px-2 py-1 cursor-pointer'
                                            >
                                                {showApiKey ? <Eye className='w-4 h-4 text-gray-500' /> : <EyeOff className='w-4 h-4 text-gray-500' />}
                                            </button>
                                        </div>
                                    </div>
                                    {/* Fetch button — shown until models are loaded */}
                                    {(!customImageModelsChecked || (customImageModelsChecked && customImageModels.length === 0)) && (
                                        <button
                                            onClick={fetchCustomImageModels}
                                            disabled={customImageModelsLoading || !llmConfig.CUSTOM_IMAGE_URL}
                                            className={`py-2.5 bg-[#EDEEEF] px-3.5 w-fit rounded-[48px] text-xs font-semibold text-[#101323] transition-all duration-200 border ${customImageModelsLoading
                                                ? "border-gray-300 cursor-not-allowed text-gray-500"
                                                : "border-[#EDEEEF] hover:bg-[#E8F0FF]/90 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                                }`}
                                        >
                                            {customImageModelsLoading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Checking for models...
                                                </span>
                                            ) : (
                                                "Fetch Available Models"
                                            )}
                                        </button>
                                    )}
                                    {/* Model dropdown — shown after successful fetch */}
                                    {customImageModelsChecked && customImageModels.length > 0 && (
                                        <div className='w-[205px]'>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Select Model
                                            </label>
                                            <Popover open={openCustomImageModelSelect} onOpenChange={setOpenCustomImageModelSelect}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openCustomImageModelSelect}
                                                        className="w-full h-12 px-4 py-4 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors hover:border-gray-400 justify-between"
                                                    >
                                                        <span className="text-sm truncate font-medium text-gray-900">
                                                            {llmConfig.CUSTOM_IMAGE_MODEL || "Select a model"}
                                                        </span>
                                                        <ChevronUp className="w-4 h-4 text-gray-500" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="p-0"
                                                    align="start"
                                                    style={{ width: "var(--radix-popover-trigger-width)" }}
                                                >
                                                    <Command>
                                                        <CommandInput placeholder="Search models..." />
                                                        <CommandList>
                                                            <CommandEmpty>No model found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {customImageModels.map((model) => (
                                                                    <CommandItem
                                                                        key={model}
                                                                        value={model}
                                                                        onSelect={(value) => {
                                                                            input_field_changed(value, "CUSTOM_IMAGE_MODEL");
                                                                            setOpenCustomImageModelSelect(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                llmConfig.CUSTOM_IMAGE_MODEL === model
                                                                                    ? "opacity-100"
                                                                                    : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <span className="text-sm font-medium text-gray-900">{model}</span>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )}
                                </div>
                            )}
                            {llmConfig.IMAGE_PROVIDER === "comfyui" && <div className='w-full'>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Workflow JSON
                                </label>
                                <div className="relative">
                                    <textarea
                                        placeholder='Paste your ComfyUI workflow JSON here (export via "Export (API)" in ComfyUI)'
                                        className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono text-xs"
                                        rows={3}
                                        value={llmConfig.COMFYUI_WORKFLOW || ""}
                                        onChange={(e) => {
                                            input_field_changed(
                                                e.target.value,
                                                "COMFYUI_WORKFLOW"
                                            );
                                        }}
                                    />
                                </div>
                            </div>}
                        </div>}
                    </div>
                </div>
                {/* No models found warning */}
                {!isImageGenerationDisabled && llmConfig.IMAGE_PROVIDER === "custom_image" && customImageModelsChecked && customImageModels.length === 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            No models found. Please check your URL and API key and try again.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ImageProvider
