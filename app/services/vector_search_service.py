"""向量检索服务模块（使用 MilvusClient API）"""

from typing import Any, Dict, List

from loguru import logger
from pymilvus import MilvusClient

from app.config import config
from app.services.vector_embedding_service import vector_embedding_service


class SearchResult:
    """搜索结果类"""

    def __init__(
        self,
        id: str,
        content: str,
        score: float,
        metadata: Dict[str, Any],
    ):
        self.id = id
        self.content = content
        self.score = score
        self.metadata = metadata

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "content": self.content,
            "score": self.score,
            "metadata": self.metadata,
        }


class VectorSearchService:
    """向量检索服务 - 负责从 Milvus 中搜索相似向量"""

    def __init__(self):
        """初始化向量检索服务"""
        logger.info("向量检索服务初始化完成")

    def _get_client(self) -> MilvusClient:
        """获取 MilvusClient 实例"""
        from app.core.milvus_client import milvus_manager
        if milvus_manager._client is None:
            raise RuntimeError("MilvusClient 未初始化，请先调用 connect()")
        return milvus_manager._client

    def search_similar_documents(self, query: str, top_k: int = 3) -> List[SearchResult]:
        """
        搜索相似文档

        Args:
            query: 查询文本
            top_k: 返回最相似的K个结果

        Returns:
            List[SearchResult]: 搜索结果列表

        Raises:
            RuntimeError: 搜索失败时抛出
        """
        try:
            from app.core.milvus_client import milvus_manager
            logger.info(f"开始搜索相似文档, 查询: {query}, topK: {top_k}")

            # 1. 将查询文本向量化
            query_vector = vector_embedding_service.embed_query(query)
            logger.debug(f"查询向量生成成功, 维度: {len(query_vector)}")

            # 2. 获取客户端
            client = self._get_client()

            # 3. 执行搜索
            search_params = {
                "metric_type": "L2",
                "params": {"nprobe": 10},
            }

            results = client.search(
                collection_name=milvus_manager.COLLECTION_NAME,
                data=[query_vector],
                limit=top_k,
                output_fields=["id", "content", "metadata"],
                search_params=search_params,
            )

            # 4. 解析搜索结果
            search_results = []
            for hits in results:
                for hit in hits:
                    entity = hit.get("entity", {})
                    distance = hit.get("distance", 0)
                    result = SearchResult(
                        id=entity.get("id", hit.get("id")),
                        content=entity.get("content"),
                        score=distance,
                        metadata=entity.get("metadata", {}),
                    )
                    search_results.append(result)

            logger.info(f"搜索完成, 找到 {len(search_results)} 个相似文档")
            return search_results

        except Exception as e:
            logger.error(f"搜索相似文档失败: {e}")
            raise RuntimeError(f"搜索失败: {e}") from e


# 全局单例
vector_search_service = VectorSearchService()
