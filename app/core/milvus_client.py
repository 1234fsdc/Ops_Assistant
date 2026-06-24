"""Milvus 客户端工厂模块"""

from loguru import logger
from pymilvus import (
    DataType,
    MilvusClient,
    MilvusException,
)

from app.config import config


class MilvusClientManager:
    """Milvus 客户端管理器（使用 MilvusClient API）"""

    # 常量定义
    COLLECTION_NAME: str = "biz"
    VECTOR_DIM: int = 1024  # 统一使用 1024 维
    ID_MAX_LENGTH: int = 100
    CONTENT_MAX_LENGTH: int = 8000

    def __init__(self) -> None:
        """初始化 Milvus 客户端管理器"""
        self._client: MilvusClient | None = None

    def connect(self) -> MilvusClient:
        """
        连接到 Milvus 服务器并初始化 collection

        Returns:
            MilvusClient: Milvus 客户端实例

        Raises:
            RuntimeError: 连接或初始化失败时抛出
        """
        try:
            # 优先使用本地 URI（Milvus-Lite）
            if config.milvus_local_uri:
                uri = config.milvus_local_uri
                logger.info(f"正在连接到本地 Milvus: {uri}")
            else:
                uri = f"http://{config.milvus_host}:{config.milvus_port}"
                logger.info(f"正在连接到 Milvus: {uri}")

            self._client = MilvusClient(uri=uri)

            logger.info("成功连接到 Milvus")

            # 检查并创建 collection
            if not self._collection_exists():
                logger.info(f"collection '{self.COLLECTION_NAME}' 不存在，正在创建...")
                self._create_collection()
                logger.info(f"成功创建 collection '{self.COLLECTION_NAME}'")
            else:
                logger.info(f"collection '{self.COLLECTION_NAME}' 已存在")
                # 检查向量维度是否匹配
                self._check_and_recreate_if_needed()

            return self._client

        except MilvusException as e:
            logger.error(f"Milvus 操作失败: {e}")
            self.close()
            raise RuntimeError(f"Milvus 操作失败: {e}") from e
        except Exception as e:
            logger.error(f"连接 Milvus 失败: {e}")
            self.close()
            raise RuntimeError(f"连接 Milvus 失败: {e}") from e

    def _collection_exists(self) -> bool:
        """检查 collection 是否存在"""
        if self._client is None:
            return False
        try:
            collections = self._client.list_collections()
            return self.COLLECTION_NAME in collections
        except Exception:
            return False

    def _check_and_recreate_if_needed(self) -> None:
        """检查向量维度，不匹配则删除重建"""
        if self._client is None:
            return
        try:
            schema = self._client.get_collection_schema(self.COLLECTION_NAME)
            for field in schema.get("fields", []):
                if field.get("name") == "vector":
                    params = field.get("params", {})
                    existing_dim = params.get("dim")
                    if existing_dim and existing_dim != self.VECTOR_DIM:
                        logger.warning(
                            f"向量维度不匹配！当前: {existing_dim}, 配置: {self.VECTOR_DIM}"
                        )
                        logger.info(f"正在删除旧 collection '{self.COLLECTION_NAME}'...")
                        self._client.drop_collection(self.COLLECTION_NAME)
                        self._create_collection()
                        logger.info(f"成功重新创建 collection，维度: {self.VECTOR_DIM}")
                    else:
                        logger.info(f"向量维度匹配: {self.VECTOR_DIM}")
                    break
        except Exception as e:
            logger.warning(f"检查 schema 失败: {e}")

    def _create_collection(self) -> None:
        """创建 biz collection"""
        if self._client is None:
            raise RuntimeError("MilvusClient 未初始化")

        from pymilvus import CollectionSchema, FieldSchema

        # 定义字段
        fields = [
            FieldSchema(
                name="id",
                dtype=DataType.VARCHAR,
                max_length=self.ID_MAX_LENGTH,
                is_primary=True,
            ),
            FieldSchema(
                name="vector",
                dtype=DataType.FLOAT_VECTOR,
                dim=self.VECTOR_DIM,
            ),
            FieldSchema(
                name="content",
                dtype=DataType.VARCHAR,
                max_length=self.CONTENT_MAX_LENGTH,
            ),
            FieldSchema(
                name="metadata",
                dtype=DataType.JSON,
            ),
        ]

        # 创建 schema
        schema = CollectionSchema(
            fields=fields,
            description="Business knowledge collection",
            enable_dynamic_field=False,
        )

        # 创建索引参数
        index_params = self._client.prepare_index_params()
        index_params.add_index(
            field_name="vector",
            index_type="IVF_FLAT",
            metric_type="L2",
            params={"nlist": 128},
        )

        # 创建 collection
        self._client.create_collection(
            collection_name=self.COLLECTION_NAME,
            schema=schema,
            index_params=index_params,
        )

        logger.info(f"成功创建 collection '{self.COLLECTION_NAME}' 及索引")

    def health_check(self) -> bool:
        """
        健康检查

        Returns:
            bool: True 表示健康，False 表示异常
        """
        try:
            if self._client is None:
                return False
            self._client.list_collections()
            return True
        except Exception as e:
            logger.error(f"Milvus 健康检查失败: {e}")
            return False

    def close(self) -> None:
        """关闭连接"""
        self._client = None
        logger.info("已关闭 Milvus 连接")

    def __enter__(self) -> "MilvusClientManager":
        """上下文管理器入口"""
        _ = self.connect()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object
    ) -> None:
        """上下文管理器退出"""
        self.close()


# 全局单例
milvus_manager = MilvusClientManager()
