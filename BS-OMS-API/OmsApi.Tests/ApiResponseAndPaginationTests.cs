using OmsApi.Models.Common;

namespace OmsApi.Tests;

public class ApiResponseTests
{
    [Fact]
    public void Ok_SetsSuccessTrue()
    {
        var response = ApiResponse<string>.Ok("data");
        Assert.True(response.Success);
    }

    [Fact]
    public void Ok_SetsDataCorrectly()
    {
        var response = ApiResponse<int>.Ok(42);
        Assert.Equal(42, response.Data);
    }

    [Fact]
    public void Ok_DefaultMessage_IsSuccess()
    {
        var response = ApiResponse<string>.Ok("x");
        Assert.Equal("Success", response.Message);
    }

    [Fact]
    public void Ok_CustomMessage_IsPreserved()
    {
        var response = ApiResponse<string>.Ok("x", "Custom message");
        Assert.Equal("Custom message", response.Message);
    }

    [Fact]
    public void Ok_WithTotalCount_IsSet()
    {
        var response = ApiResponse<string>.Ok("x", "msg", 99);
        Assert.Equal(99, response.TotalCount);
    }

    [Fact]
    public void Ok_WithoutTotalCount_IsNull()
    {
        var response = ApiResponse<string>.Ok("x");
        Assert.Null(response.TotalCount);
    }

    [Fact]
    public void Fail_SetsSuccessFalse()
    {
        var response = ApiResponse<string>.Fail("error msg");
        Assert.False(response.Success);
    }

    [Fact]
    public void Fail_SetsMessageCorrectly()
    {
        var response = ApiResponse<string>.Fail("Something went wrong");
        Assert.Equal("Something went wrong", response.Message);
    }

    [Fact]
    public void Fail_DataIsDefault()
    {
        var response = ApiResponse<string>.Fail("err");
        Assert.Null(response.Data);
    }

    [Fact]
    public void Ok_WorksWithComplexType()
    {
        var list = new List<int> { 1, 2, 3 };
        var response = ApiResponse<List<int>>.Ok(list);
        Assert.Equal(list, response.Data);
    }
}

public class PaginatedResultTests
{
    [Fact]
    public void HasMore_WhenMoreItemsExist_ReturnsTrue()
    {
        var result = new PaginatedResult<int>
        {
            Items = Enumerable.Range(1, 10).ToList(),
            TotalCount = 25,
            Page = 1,
            PageSize = 10
        };
        Assert.True(result.HasMore);
    }

    [Fact]
    public void HasMore_WhenOnLastPage_ReturnsFalse()
    {
        var result = new PaginatedResult<int>
        {
            Items = Enumerable.Range(1, 5).ToList(),
            TotalCount = 15,
            Page = 2,
            PageSize = 10
        };
        // Page 2 * PageSize 10 = 20 > TotalCount 15 → no more
        Assert.False(result.HasMore);
    }

    [Fact]
    public void HasMore_WhenExactlyOnLastPage_ReturnsFalse()
    {
        var result = new PaginatedResult<string>
        {
            Items = new List<string> { "a", "b" },
            TotalCount = 20,
            Page = 2,
            PageSize = 10
        };
        // 2*10 = 20 = TotalCount → no more
        Assert.False(result.HasMore);
    }

    [Fact]
    public void HasMore_EmptyResult_ReturnsFalse()
    {
        var result = new PaginatedResult<string>
        {
            Items = new List<string>(),
            TotalCount = 0,
            Page = 1,
            PageSize = 10
        };
        Assert.False(result.HasMore);
    }

    [Fact]
    public void Items_DefaultsToEmptyList()
    {
        var result = new PaginatedResult<int>();
        Assert.NotNull(result.Items);
        Assert.Empty(result.Items);
    }
}
