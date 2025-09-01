import { useState, useCallback } from "react";

/**
 * Custom hook for handling API operations with loading states and error handling
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, loading, error, execute, reset }
 */
export const useApi = (apiFunction, options = {}) => {
  const {
    initialData = null,
    onSuccess = () => {},
    onError = () => {},
    autoExecute = false,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      try {
        setLoading(true);
        setError(null);

        const result = await apiFunction(...args);

        if (result.success) {
          setData(result.data);
          onSuccess(result);
        } else {
          setError(result.message);
          onError(result);
        }

        return result;
      } catch (err) {
        const errorMessage = err.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด";
        setError(errorMessage);
        onError({ success: false, message: errorMessage });
        return { success: false, message: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  // Auto execute on mount if specified
  useState(() => {
    if (autoExecute) {
      execute();
    }
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

/**
 * Custom hook for CRUD operations
 * @param {Object} service - The service instance
 * @returns {Object} - CRUD operations with loading states
 */
export const useCrud = (service) => {
  const [list, setList] = useState([]);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get all items
  const fetchList = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const result = await service.getAll(params);
        if (result.success) {
          setList(result.data);
        } else {
          setError(result.message);
        }
        return result;
      } catch (err) {
        setError(err.message);
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  // Get single item
  const fetchItem = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        const result = await service.getById(id);
        if (result.success) {
          setItem(result.data);
        } else {
          setError(result.message);
        }
        return result;
      } catch (err) {
        setError(err.message);
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  // Create new item
  const createItem = useCallback(
    async (data) => {
      setLoading(true);
      setError(null);
      try {
        const result = await service.create(data);
        if (result.success) {
          setList((prev) => [...prev, result.data]);
        } else {
          setError(result.message);
        }
        return result;
      } catch (err) {
        setError(err.message);
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  // Update existing item
  const updateItem = useCallback(
    async (id, data) => {
      setLoading(true);
      setError(null);
      try {
        const result = await service.update(id, data);
        if (result.success) {
          setList((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, ...result.data } : item
            )
          );
          if (item && item.id === id) {
            setItem({ ...item, ...result.data });
          }
        } else {
          setError(result.message);
        }
        return result;
      } catch (err) {
        setError(err.message);
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [service, item]
  );

  // Delete item
  const deleteItem = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        const result = await service.delete(id);
        if (result.success) {
          setList((prev) => prev.filter((item) => item.id !== id));
          if (item && item.id === id) {
            setItem(null);
          }
        } else {
          setError(result.message);
        }
        return result;
      } catch (err) {
        setError(err.message);
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [service, item]
  );

  // Reset states
  const reset = useCallback(() => {
    setList([]);
    setItem(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    list,
    item,
    loading,
    error,
    fetchList,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    reset,
  };
};

/**
 * Custom hook for pagination
 * @param {Object} service - The service instance
 * @param {Object} initialParams - Initial pagination parameters
 * @returns {Object} - Pagination state and functions
 */
export const usePagination = (service, initialParams = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    ...initialParams,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = {
          ...pagination,
          ...params,
        };

        const result = await service.getAll(queryParams);
        if (result.success) {
          setData(result.data.items || result.data);
          setPagination((prev) => ({
            ...prev,
            total: result.data.total || 0,
            totalPages: result.data.totalPages || 0,
            ...params,
          }));
        } else {
          setError(result.message);
        }
        return result;
      } catch (err) {
        setError(err.message);
        return { success: false, message: err.message };
      } finally {
        setLoading(false);
      }
    },
    [service, pagination]
  );

  const goToPage = useCallback(
    (page) => {
      fetchData({ page });
    },
    [fetchData]
  );

  const changeLimit = useCallback(
    (limit) => {
      fetchData({ page: 1, limit });
    },
    [fetchData]
  );

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      goToPage(pagination.page + 1);
    }
  }, [pagination.page, pagination.totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  }, [pagination.page, goToPage]);

  const reset = useCallback(() => {
    setData([]);
    setPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 0 }));
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    pagination,
    loading,
    error,
    fetchData,
    goToPage,
    changeLimit,
    nextPage,
    prevPage,
    reset,
  };
};

const apiHooks = {
  useApi,
  useCrud,
  usePagination,
};

export default apiHooks;
