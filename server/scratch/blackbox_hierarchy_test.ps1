param(
    [string]$BaseUrl = $(if ($env:BBOX_API_BASE_URL) { $env:BBOX_API_BASE_URL } else { 'http://localhost:3001/api' }),
    [switch]$CleanupOnly,
    [switch]$CleanupExisting
)

$ErrorActionPreference = 'Stop'

$baseUrl = $BaseUrl.TrimEnd('/')
$stamp = Get-Date -Format 'yyyyMMddHHmmss'
$password = 'Test123!'
$currentStep = 'bootstrap'
$blackboxNamePrefix = 'ZZ BBOX'

$results = New-Object System.Collections.Generic.List[object]
$created = [ordered]@{}

function Add-Result {
    param(
        [string]$Area,
        [string]$Check,
        [bool]$Passed,
        [string]$Details
    )

    $results.Add([pscustomobject]@{
            area    = $Area
            check   = $Check
            passed  = $Passed
            details = $Details
        })
}

function Assert-True {
    param(
        [string]$Area,
        [string]$Check,
        [bool]$Condition,
        [string]$PassDetails,
        [string]$FailDetails
    )

    if ($Condition) {
        Add-Result -Area $Area -Check $Check -Passed $true -Details $PassDetails
    }
    else {
        Add-Result -Area $Area -Check $Check -Passed $false -Details $FailDetails
    }
}

function Login {
    param(
        [string]$Username,
        [string]$Password
    )

    $body = @{
        username = $Username
        password = $Password
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType 'application/json' -Body $body
}

function HeadersFromToken {
    param([string]$Token)
    @{
        Authorization = "Bearer $Token"
    }
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers,
        [object]$Body = $null
    )

    $params = @{
        Uri     = "$baseUrl$Path"
        Method  = $Method
        Headers = $Headers
    }

    if ($null -ne $Body) {
        $params['ContentType'] = 'application/json'
        $params['Body'] = ($Body | ConvertTo-Json -Depth 8)
    }

    Invoke-RestMethod @params
}

function Invoke-ApiWithRetry {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers,
        [object]$Body = $null,
        [int]$Attempts = 2,
        [int]$DelayMs = 750
    )

    $lastError = $null
    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            return Invoke-Api -Method $Method -Path $Path -Headers $Headers -Body $Body
        }
        catch {
            $lastError = $_
            if ($attempt -lt $Attempts) {
                Start-Sleep -Milliseconds $DelayMs
            }
        }
    }

    throw $lastError
}

function Invoke-ApiExpectError {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers
    )

    try {
        $response = Invoke-Api -Method $Method -Path $Path -Headers $Headers
        return [pscustomobject]@{
            success = $true
            message = 'Request unexpectedly succeeded'
            body    = $response
        }
    }
    catch {
        $message = $_.Exception.Message
        $statusCode = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        return [pscustomobject]@{
            success    = $false
            statusCode = $statusCode
            message    = $message
        }
    }
}

function New-TestEmployee {
    param(
        [hashtable]$Headers,
        [string]$Name,
        [int]$BiometricId,
        [string]$Department,
        [string]$Username,
        [string]$Role,
        [int]$ManagerId
    )

    $position = 'Manager'
    if ($Role -eq 'EMPLOYEE') {
        $position = 'Executive'
    }

    $payload = @{
        name        = $Name
        biometricId = $BiometricId
        department  = $Department
        position    = $position
        employeeType = 'Full-time'
        createUser  = $true
        username    = $Username
        password    = $password
        role        = $Role
    }

    if ($ManagerId -gt 0) {
        $payload['managerId'] = $ManagerId
    }

    Invoke-Api -Method 'Post' -Path '/employees' -Headers $Headers -Body $payload
}

function Get-BlackboxEmployees {
    param([hashtable]$Headers)

    $response = Invoke-Api -Method 'Get' -Path "/employees?search=$([uri]::EscapeDataString($blackboxNamePrefix))&limit=200" -Headers $Headers
    @($response.data.employees | Where-Object { $_.name -like "$blackboxNamePrefix*" })
}

function Remove-BlackboxEmployees {
    param([hashtable]$Headers)

    $matches = Get-BlackboxEmployees -Headers $Headers
    if (-not $matches.Count) {
        return [pscustomobject]@{
            count       = 0
            employeeIds = @()
            names       = @()
        }
    }

    foreach ($employee in ($matches | Sort-Object id -Descending)) {
        [void](Invoke-Api -Method 'Delete' -Path "/employees/$($employee.id)" -Headers $Headers)
    }

    return [pscustomobject]@{
        count       = $matches.Count
        employeeIds = @($matches | ForEach-Object { $_.id })
        names       = @($matches | ForEach-Object { $_.name })
    }
}

try {
    $adminLogin = Login -Username 'admin' -Password 'admin123'
    $adminHeaders = HeadersFromToken -Token $adminLogin.data.token

    if ($CleanupOnly) {
        $currentStep = 'cleanup existing bbox employees'
        $cleanup = Remove-BlackboxEmployees -Headers $adminHeaders
        Add-Result -Area 'cleanup' -Check 'deactivate blackbox employees' -Passed $true -Details "Deactivated $($cleanup.count) employee(s): $($cleanup.employeeIds -join ', ')"

        [pscustomobject]@{
            baseUrl = $baseUrl
            summary = [pscustomobject]@{
                passed = 1
                failed = 0
            }
            cleanup = $cleanup
            results = $results
        } | ConvertTo-Json -Depth 8
        exit 0
    }

    if ($CleanupExisting) {
        $currentStep = 'cleanup stale bbox employees before run'
        $cleanup = Remove-BlackboxEmployees -Headers $adminHeaders
        Add-Result -Area 'cleanup' -Check 'deactivate stale blackbox employees before run' -Passed $true -Details "Deactivated $($cleanup.count) employee(s): $($cleanup.employeeIds -join ', ')"
    }

    $topUsername = "bbox_top_$stamp"
    $midUsername = "bbox_mid_$stamp"
    $empUsername = "bbox_emp_$stamp"
    $created['topUsername'] = $topUsername
    $created['midUsername'] = $midUsername
    $created['employeeUsername'] = $empUsername

    $currentStep = 'create top manager'
    $topCreate = New-TestEmployee -Headers $adminHeaders -Name "ZZ BBOX TOP $stamp" -BiometricId ([int]"9$($stamp.Substring(8,4))") -Department 'QA' -Username $topUsername -Role 'MANAGER' -ManagerId 0
    $topEmployeeId = $topCreate.data.employee.id
    $created['topEmployeeId'] = $topEmployeeId

    $currentStep = 'create mid manager'
    $midCreate = New-TestEmployee -Headers $adminHeaders -Name "ZZ BBOX MID $stamp" -BiometricId ([int]"8$($stamp.Substring(8,4))") -Department 'QA' -Username $midUsername -Role 'MANAGER' -ManagerId $topEmployeeId
    $midEmployeeId = $midCreate.data.employee.id
    $created['midEmployeeId'] = $midEmployeeId

    $currentStep = 'create employee'
    $empCreate = New-TestEmployee -Headers $adminHeaders -Name "ZZ BBOX EMP $stamp" -BiometricId ([int]"7$($stamp.Substring(8,4))") -Department 'QA' -Username $empUsername -Role 'EMPLOYEE' -ManagerId $midEmployeeId
    $empEmployeeId = $empCreate.data.employee.id
    $created['employeeId'] = $empEmployeeId

    Add-Result -Area 'setup' -Check 'create hierarchy chain' -Passed $true -Details "Created top=$topEmployeeId mid=$midEmployeeId employee=$empEmployeeId"

    $currentStep = 'login top'
    $topLogin = Login -Username $topUsername -Password $password
    $currentStep = 'login mid'
    $midLogin = Login -Username $midUsername -Password $password
    $currentStep = 'login employee'
    $empLogin = Login -Username $empUsername -Password $password

    $topHeaders = HeadersFromToken -Token $topLogin.data.token
    $midHeaders = HeadersFromToken -Token $midLogin.data.token
    $empHeaders = HeadersFromToken -Token $empLogin.data.token

    $midUserId = $midLogin.data.user.id
    $topUserId = $topLogin.data.user.id

    $currentStep = 'employee list as employee'
    $empList = Invoke-Api -Method 'Get' -Path '/employees?limit=100' -Headers $empHeaders
    $currentStep = 'employee list as mid manager'
    $midList = Invoke-Api -Method 'Get' -Path '/employees?limit=100' -Headers $midHeaders
    $currentStep = 'employee list as top manager'
    $topList = Invoke-Api -Method 'Get' -Path '/employees?limit=100' -Headers $topHeaders

    $empIdsForEmployee = @($empList.data.employees | ForEach-Object { $_.id })
    $empIdsForMid = @($midList.data.employees | ForEach-Object { $_.id })
    $empIdsForTop = @($topList.data.employees | ForEach-Object { $_.id })

    Assert-True -Area 'employees' -Check 'employee sees self only' `
        -Condition (($empIdsForEmployee.Count -eq 1) -and ($empIdsForEmployee -contains $empEmployeeId)) `
        -PassDetails "Employee scope returned only own record: $($empIdsForEmployee -join ', ')" `
        -FailDetails "Employee scope returned unexpected employees: $($empIdsForEmployee -join ', ')"

    Assert-True -Area 'employees' -Check 'mid manager sees self plus descendant only' `
        -Condition (($empIdsForMid -contains $midEmployeeId) -and ($empIdsForMid -contains $empEmployeeId) -and -not ($empIdsForMid -contains $topEmployeeId)) `
        -PassDetails "Mid manager sees own hierarchy: $($empIdsForMid -join ', ')" `
        -FailDetails "Mid manager scope mismatch: $($empIdsForMid -join ', ')"

    Assert-True -Area 'employees' -Check 'top manager sees recursive hierarchy' `
        -Condition (($empIdsForTop -contains $topEmployeeId) -and ($empIdsForTop -contains $midEmployeeId) -and ($empIdsForTop -contains $empEmployeeId)) `
        -PassDetails "Top manager sees top, mid, and employee: $($empIdsForTop -join ', ')" `
        -FailDetails "Top manager missing recursive visibility: $($empIdsForTop -join ', ')"

    $currentStep = 'team endpoint as top manager for mid team'
    $teamAsTopForMid = Invoke-ApiExpectError -Method 'Get' -Path "/employees/$midEmployeeId/team" -Headers $topHeaders
    Assert-True -Area 'employees' -Check 'top manager can open another manager team endpoint' `
        -Condition $teamAsTopForMid.success `
        -PassDetails 'Top manager can open descendant team endpoint.' `
        -FailDetails "Current behavior blocks this with: $($teamAsTopForMid.message)"

    $attendanceDate = '2026-05-20'
    $currentStep = 'seed attendance for mid'
    [void](Invoke-Api -Method 'Post' -Path '/attendance/manual' -Headers $adminHeaders -Body @{
            employeeId = $midEmployeeId
            date       = $attendanceDate
            checkIn    = '09:15'
            checkOut   = '18:10'
            status     = 'PRESENT'
        })
    $currentStep = 'seed attendance for employee'
    [void](Invoke-Api -Method 'Post' -Path '/attendance/manual' -Headers $adminHeaders -Body @{
            employeeId = $empEmployeeId
            date       = $attendanceDate
            checkIn    = '09:40'
            checkOut   = '18:00'
            status     = 'PRESENT'
        })
    Add-Result -Area 'attendance' -Check 'seed manual attendance' -Passed $true -Details "Inserted attendance for $attendanceDate"
    Start-Sleep -Milliseconds 750

    $currentStep = 'attendance own as employee'
    $empOwnAttendance = Invoke-ApiWithRetry -Method 'Get' -Path "/attendance/$empEmployeeId?month=2026-05" -Headers $empHeaders
    $currentStep = 'attendance manager as employee'
    $empOtherAttendance = Invoke-ApiExpectError -Method 'Get' -Path "/attendance/$midEmployeeId?month=2026-05" -Headers $empHeaders
    $currentStep = 'attendance employee as mid manager'
    $midEmpAttendance = Invoke-Api -Method 'Get' -Path "/attendance/$empEmployeeId?month=2026-05" -Headers $midHeaders
    $currentStep = 'attendance top as mid manager'
    $midTopAttendance = Invoke-ApiExpectError -Method 'Get' -Path "/attendance/$topEmployeeId?month=2026-05" -Headers $midHeaders
    $currentStep = 'attendance mid as top manager'
    $topMidAttendance = Invoke-Api -Method 'Get' -Path "/attendance/$midEmployeeId?month=2026-05" -Headers $topHeaders

    Assert-True -Area 'attendance' -Check 'employee can view own attendance' `
        -Condition (@($empOwnAttendance.data.attendance | Where-Object { $_.date -eq $attendanceDate }).Count -gt 0) `
        -PassDetails 'Employee retrieved own attendance month.' `
        -FailDetails 'Employee could not retrieve own attendance record.'

    Assert-True -Area 'attendance' -Check 'employee cannot view manager attendance' `
        -Condition (-not $empOtherAttendance.success) `
        -PassDetails "Employee blocked from manager attendance: $($empOtherAttendance.message)" `
        -FailDetails 'Employee unexpectedly accessed manager attendance.'

    Assert-True -Area 'attendance' -Check 'mid manager can view employee attendance' `
        -Condition (@($midEmpAttendance.data.attendance | Where-Object { $_.date -eq $attendanceDate }).Count -gt 0) `
        -PassDetails 'Mid manager retrieved descendant attendance.' `
        -FailDetails 'Mid manager could not retrieve employee attendance.'

    Assert-True -Area 'attendance' -Check 'mid manager cannot view top manager attendance' `
        -Condition (-not $midTopAttendance.success) `
        -PassDetails "Mid manager blocked from ancestor attendance: $($midTopAttendance.message)" `
        -FailDetails 'Mid manager unexpectedly accessed top manager attendance.'

    Assert-True -Area 'attendance' -Check 'top manager can view mid manager attendance' `
        -Condition (@($topMidAttendance.data.attendance | Where-Object { $_.date -eq $attendanceDate }).Count -gt 0) `
        -PassDetails 'Top manager retrieved descendant manager attendance.' `
        -FailDetails 'Top manager could not retrieve mid manager attendance.'

    $currentStep = 'employee leave apply'
    $employeeLeave = Invoke-Api -Method 'Post' -Path '/leaves' -Headers $empHeaders -Body @{
        type        = 'Casual Leave'
        startDate   = '2026-06-15'
        endDate     = '2026-06-16'
        days        = 2
        reason      = 'Blackbox employee leave'
        approverIds = [string]$midUserId
    }

    $employeeLeaveId = $employeeLeave.data.leave.id
    Assert-True -Area 'leaves' -Check 'employee leave starts pending' `
        -Condition ($employeeLeave.data.leave.status -eq 'PENDING') `
        -PassDetails "Employee leave $employeeLeaveId created with PENDING status." `
        -FailDetails "Employee leave $employeeLeaveId did not stay pending."

    $currentStep = 'mid manager leave list'
    $midLeaves = Invoke-Api -Method 'Get' -Path '/leaves' -Headers $midHeaders
    Assert-True -Area 'leaves' -Check 'mid manager can see employee leave' `
        -Condition (@($midLeaves.data.leaves | Where-Object { $_.id -eq $employeeLeaveId }).Count -eq 1) `
        -PassDetails 'Mid manager sees descendant employee leave.' `
        -FailDetails 'Mid manager cannot see descendant employee leave.'

    $currentStep = 'mid manager approve employee leave'
    [void](Invoke-Api -Method 'Put' -Path "/leaves/$employeeLeaveId/approve" -Headers $midHeaders -Body @{
            reason = 'Approved during blackbox test'
        })
    $currentStep = 'top manager employee-specific leave list'
    $topEmployeeLeaves = Invoke-Api -Method 'Get' -Path "/leaves?employeeId=$empEmployeeId" -Headers $topHeaders
    $approvedEmployeeLeave = @($topEmployeeLeaves.data.leaves | Where-Object { $_.id -eq $employeeLeaveId })[0]

    Assert-True -Area 'leaves' -Check 'top manager can see approved lower-level employee leave' `
        -Condition (($null -ne $approvedEmployeeLeave) -and ($approvedEmployeeLeave.status -eq 'APPROVED')) `
        -PassDetails 'Top manager sees approved leave from nested employee.' `
        -FailDetails 'Top manager cannot see nested employee approved leave.'

    $currentStep = 'mid manager own leave apply'
    $managerLeave = Invoke-Api -Method 'Post' -Path '/leaves' -Headers $midHeaders -Body @{
        type        = 'Casual Leave'
        startDate   = '2026-06-20'
        endDate     = '2026-06-20'
        days        = 1
        reason      = 'Blackbox manager leave'
        approverIds = [string]$topUserId
    }

    $managerLeaveId = $managerLeave.data.leave.id
    Assert-True -Area 'leaves' -Check 'manager leave is auto-approved on submit' `
        -Condition ($managerLeave.data.leave.status -eq 'APPROVED') `
        -PassDetails "Manager leave $managerLeaveId auto-approved and only needs notification flow." `
        -FailDetails "Manager leave $managerLeaveId was not auto-approved."

    $currentStep = 'top manager manager-specific leave list'
    $topManagerLeaves = Invoke-Api -Method 'Get' -Path "/leaves?employeeId=$midEmployeeId" -Headers $topHeaders
    $visibleManagerLeave = @($topManagerLeaves.data.leaves | Where-Object { $_.id -eq $managerLeaveId })[0]
    Assert-True -Area 'leaves' -Check 'top manager can see lower manager leave' `
        -Condition (($null -ne $visibleManagerLeave) -and ($visibleManagerLeave.status -eq 'APPROVED')) `
        -PassDetails 'Top manager sees lower manager leave as expected.' `
        -FailDetails 'Top manager cannot see lower manager leave.'

    $currentStep = 'employee querying manager-specific leaves'
    $employeeOtherLeaves = Invoke-ApiExpectError -Method 'Get' -Path "/leaves?employeeId=$midEmployeeId" -Headers $empHeaders
    Assert-True -Area 'leaves' -Check 'employee cannot query manager-specific leaves' `
        -Condition (-not $employeeOtherLeaves.success) `
        -PassDetails "Employee blocked from manager leave list: $($employeeOtherLeaves.message)" `
        -FailDetails 'Employee unexpectedly accessed manager-specific leaves.'
}
catch {
    Add-Result -Area 'fatal' -Check 'script execution' -Passed $false -Details "$currentStep -> $($_.Exception.Message)"
}

$passed = @($results | Where-Object { $_.passed }).Count
$failed = @($results | Where-Object { -not $_.passed }).Count

[pscustomobject]@{
    baseUrl = $baseUrl
    created = $created
    summary = [pscustomobject]@{
        passed = $passed
        failed = $failed
    }
    results = $results
} | ConvertTo-Json -Depth 8
