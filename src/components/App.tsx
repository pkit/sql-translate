import {FC, useCallback, useEffect, useMemo, useState} from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import debounce from 'lodash.debounce';
import Editor from '@monaco-editor/react';
import {
    CircularProgress,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Stack, Typography
} from "@mui/material";

export const App: FC = () => {
    const [code1, setCode1] = useState("");
    const [code2, setCode2] = useState("");
    const [transpile, setTranspile] = useState(() => (v: string, _from: string, _to: string) => { return v })
    const [fromDialect, setFromDialect] = useState("clickhouse")
    const [toDialect, setToDialect] = useState("clickhouse")


    const defaultCode = `
CREATE TABLE test
(
    id        UInt64,
    timestamp DateTime64,
    data      TEXT,
    max_hits  UInt64,
    sum_hits  UInt64
) ENGINE=MergeTree
PRIMARY KEY (id, toStartOfDay(timestamp), timestamp)
TTL
  timestamp + INTERVAL '1' DAY
GROUP BY
  id,
  toStartOfDay(timestamp)
        SET
            max_hits = MAX(max_hits),
  sum_hits = SUM(sum_hits)
`

    const changeHandler1 = useCallback((value: string) => {
        setCode1(value)
        try {
            const res = transpile(value, fromDialect, toDialect)
            setCode2(res)
        } catch (e) {
            console.error(e)
        }
    }, [transpile, fromDialect, toDialect])

    const debouncedChangeHandler1 = useMemo(
        () => debounce(changeHandler1, 300)
        , [changeHandler1]);

    const handleEditorChange1 = (value: (string | undefined)) => {
        if (value != null) {
            debouncedChangeHandler1(value)
        }
    }

    const handleChangeFrom = useCallback((event: SelectChangeEvent) => {
        setFromDialect(event.target.value)
        setCode2(transpile(code1, event.target.value, toDialect))
    }, [code1, toDialect, transpile])

    const handleChangeTo = useCallback((event: SelectChangeEvent) => {
        setToDialect(event.target.value)
        setCode2(transpile(code1, fromDialect, event.target.value))
    }, [code1, fromDialect, transpile])

    useEffect(() => {
        setCode1(defaultCode)
    }, [defaultCode])

    useEffect(() => {
        const load = async () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const { loadPyodide } = await import("https://cdn.jsdelivr.net/pyodide/v0.23.2/full/pyodide.mjs")
            const pyodide = await loadPyodide()
            await pyodide.loadPackage("micropip")
            const micropip = pyodide.pyimport("micropip")
            await micropip.install('sqlglot')
            const namespace = pyodide.globals.get("dict")()
            pyodide.runPython(`
                import sqlglot
                from pyodide.ffi import to_js


                def transpile(sql, read=None, write=None):
                    try:
                        compiled = sqlglot.transpile(sql, read=read, write=write, pretty=True)
                        return to_js(";\\n".join(compiled) + "\\n")
                    except Exception as e:
                        err_lines = str(e).splitlines()
                        return to_js("\\n".join(["-- ERROR"] + ["-- " + l for l in err_lines] + [""]))
            `, { globals: namespace })
            const pyTranspile = namespace.get("transpile")
            const transpile = () => (sql: string, from: string, to: string) => {
                return pyTranspile.callKwargs(sql, { read: from, write: to })
            }
            setTranspile(transpile)
            setCode2(transpile()(defaultCode, fromDialect, toDialect))
        }

        load().catch(console.error)
    }, [defaultCode])

    return (
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <FormControl>
                        <InputLabel id="demo-simple-select-label">From dialect:</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={fromDialect}
                            label="From dialect:"
                            onChange={handleChangeFrom}
                        >
                            <MenuItem value={"clickhouse"}>ClickHouse</MenuItem>
                            <MenuItem value={"postgres"}>PostgreSQL</MenuItem>
                            <MenuItem value={"snowflake"}>Snowflake</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6}>
                    <FormControl>
                        <InputLabel id="demo-simple-select-label">To dialect:</InputLabel>
                        <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={toDialect}
                            label="To dialect:"
                            onChange={handleChangeTo}
                        >
                            <MenuItem value={"clickhouse"}>ClickHouse</MenuItem>
                            <MenuItem value={"postgres"}>PostgreSQL</MenuItem>
                            <MenuItem value={"snowflake"}>Snowflake</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6}>
                    <Editor height="90vh" width="100%" defaultLanguage="sql" defaultValue={defaultCode} value={code1} onChange={handleEditorChange1}/>
                </Grid>
                <Grid item xs={6}>
                    {(code2) ?
                        <Editor height="90vh" width="100%" defaultLanguage="sql" value={code2} options={{readOnly: true}}/>
                        :
                        <Stack alignItems="center">
                            <Typography color="text.primary">Loading sqlglot library...</Typography>
                            <CircularProgress />
                        </Stack>
                    }
                </Grid>
            </Grid>
    )
}
