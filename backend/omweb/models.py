

# ==========================================
# Model Metadata Schemas
# ==========================================
class ModelQuantization(BaseModel):
    name: Optional[str] = None
    bits_per_weight: Optional[float] = None

class ModelInstanceConfig(BaseModel):
    context_length: int
    eval_batch_size: Optional[int] = None
    flash_attention: Optional[bool] = None
    num_experts: Optional[int] = None
    offload_kv_cache_to_gpu: Optional[bool] = None

class ModelInstance(BaseModel):
    id: str
    config: ModelInstanceConfig

class ModelCapabilities(BaseModel):
    vision: bool = False
    trained_for_tool_use: bool = False

class ModelMetadata(BaseModel):
    type: str = "llm"
    publisher: Optional[str] = None
    key: str
    display_name: Optional[str] = None
    architecture: Optional[str] = None
    quantization: Optional[ModelQuantization] = None
    size_bytes: Optional[int] = None
    params_string: Optional[str] = None
    loaded_instances: Optional[List[ModelInstance]] = None
    max_context_length: Optional[int] = None
    format: Optional[str] = None
    capabilities: Optional[ModelCapabilities] = None
    description: Optional[str] = None
